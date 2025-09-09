import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

interface Migration {
  id: string
  name: string
  timestamp: Date
  up: string
  down?: string
}

interface MigrationRecord {
  id: string
  name: string
  executed_at: string
  checksum: string
}

class MigrationRunner {
  private supabase
  private migrationsPath: string

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.migrationsPath = path.join(process.cwd(), 'lib/migrations/sql')
  }

  async initializeMigrationsTable() {
    const { error } = await this.supabase.rpc('create_migrations_table')
    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create migrations table: ${error.message}`)
    }
  }

  async getMigrationFiles(): Promise<Migration[]> {
    try {
      const files = await fs.readdir(this.migrationsPath)
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort()

      const migrations: Migration[] = []

      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsPath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        
        // Extract metadata from filename: timestamp_name.sql
        const match = file.match(/^(\d{14})_(.+)\.sql$/)
        if (!match) {
          console.warn(`Skipping invalid migration file: ${file}`)
          continue
        }

        const [, timestamp, name] = match
        const date = new Date(
          parseInt(timestamp.substring(0, 4)), // year
          parseInt(timestamp.substring(4, 6)) - 1, // month (0-indexed)
          parseInt(timestamp.substring(6, 8)), // day
          parseInt(timestamp.substring(8, 10)), // hour
          parseInt(timestamp.substring(10, 12)), // minute
          parseInt(timestamp.substring(12, 14)) // second
        )

        // Split up and down migrations
        const parts = content.split('-- DOWN')
        const up = parts[0].replace('-- UP', '').trim()
        const down = parts[1] ? parts[1].trim() : undefined

        migrations.push({
          id: timestamp,
          name: name.replace(/[-_]/g, ' '),
          timestamp: date,
          up,
          down
        })
      }

      return migrations
    } catch (error) {
      throw new Error(`Failed to read migration files: ${error}`)
    }
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const { data, error } = await this.supabase
      .from('schema_migrations')
      .select('*')
      .order('executed_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get executed migrations: ${error.message}`)
    }

    return data || []
  }

  private calculateChecksum(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  async runMigrations(options: { dryRun?: boolean; target?: string } = {}) {
    const { dryRun = false, target } = options

    console.log('🔄 Starting database migration...')

    try {
      await this.initializeMigrationsTable()
      
      const allMigrations = await this.getMigrationFiles()
      const executedMigrations = await this.getExecutedMigrations()
      const executedIds = new Set(executedMigrations.map(m => m.id))

      // Filter migrations to run
      let migrationsToRun = allMigrations.filter(m => !executedIds.has(m.id))
      
      if (target) {
        const targetIndex = migrationsToRun.findIndex(m => m.id === target)
        if (targetIndex === -1) {
          throw new Error(`Target migration ${target} not found`)
        }
        migrationsToRun = migrationsToRun.slice(0, targetIndex + 1)
      }

      if (migrationsToRun.length === 0) {
        console.log('✅ No new migrations to run')
        return
      }

      console.log(`📋 Found ${migrationsToRun.length} migrations to run:`)
      migrationsToRun.forEach(m => {
        console.log(`  - ${m.id}: ${m.name}`)
      })

      if (dryRun) {
        console.log('🔍 Dry run mode - no changes will be made')
        return
      }

      // Run migrations
      for (const migration of migrationsToRun) {
        console.log(`⚡ Running migration ${migration.id}: ${migration.name}`)

        try {
          // Execute the migration SQL
          const { error: sqlError } = await this.supabase.rpc('exec_sql', {
            sql: migration.up
          })

          if (sqlError) {
            throw new Error(`SQL execution failed: ${sqlError.message}`)
          }

          // Record the migration as executed
          const { error: recordError } = await this.supabase
            .from('schema_migrations')
            .insert({
              id: migration.id,
              name: migration.name,
              executed_at: new Date().toISOString(),
              checksum: this.calculateChecksum(migration.up)
            })

          if (recordError) {
            throw new Error(`Failed to record migration: ${recordError.message}`)
          }

          console.log(`✅ Migration ${migration.id} completed successfully`)

        } catch (error) {
          console.error(`❌ Migration ${migration.id} failed:`, error)
          throw error
        }
      }

      console.log('🎉 All migrations completed successfully!')

    } catch (error) {
      console.error('💥 Migration failed:', error)
      throw error
    }
  }

  async rollback(steps: number = 1) {
    console.log(`🔄 Rolling back ${steps} migration(s)...`)

    try {
      const executedMigrations = await this.getExecutedMigrations()
      const toRollback = executedMigrations
        .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
        .slice(0, steps)

      if (toRollback.length === 0) {
        console.log('ℹ️ No migrations to rollback')
        return
      }

      const allMigrations = await this.getMigrationFiles()
      const migrationMap = new Map(allMigrations.map(m => [m.id, m]))

      for (const executed of toRollback) {
        const migration = migrationMap.get(executed.id)
        
        if (!migration) {
          console.warn(`⚠️ Migration file not found for ${executed.id}, skipping rollback`)
          continue
        }

        if (!migration.down) {
          console.warn(`⚠️ No rollback SQL found for ${executed.id}, skipping`)
          continue
        }

        console.log(`⬇️ Rolling back migration ${executed.id}: ${executed.name}`)

        try {
          // Execute the rollback SQL
          const { error: sqlError } = await this.supabase.rpc('exec_sql', {
            sql: migration.down
          })

          if (sqlError) {
            throw new Error(`Rollback SQL execution failed: ${sqlError.message}`)
          }

          // Remove the migration record
          const { error: deleteError } = await this.supabase
            .from('schema_migrations')
            .delete()
            .eq('id', executed.id)

          if (deleteError) {
            throw new Error(`Failed to remove migration record: ${deleteError.message}`)
          }

          console.log(`✅ Rollback of ${executed.id} completed successfully`)

        } catch (error) {
          console.error(`❌ Rollback of ${executed.id} failed:`, error)
          throw error
        }
      }

      console.log('🎉 Rollback completed successfully!')

    } catch (error) {
      console.error('💥 Rollback failed:', error)
      throw error
    }
  }

  async status() {
    const allMigrations = await this.getMigrationFiles()
    const executedMigrations = await this.getExecutedMigrations()
    const executedIds = new Set(executedMigrations.map(m => m.id))

    console.log('📊 Migration Status:')
    console.log('==================')

    if (allMigrations.length === 0) {
      console.log('No migrations found')
      return
    }

    allMigrations.forEach(migration => {
      const status = executedIds.has(migration.id) ? '✅' : '⏳'
      const executed = executedMigrations.find(m => m.id === migration.id)
      const date = executed ? new Date(executed.executed_at).toLocaleString() : 'Pending'
      
      console.log(`${status} ${migration.id}: ${migration.name} (${date})`)
    })

    const pending = allMigrations.filter(m => !executedIds.has(m.id))
    console.log(`\n📈 Summary: ${executedMigrations.length} executed, ${pending.length} pending`)
  }
}

export { MigrationRunner }

// CLI usage
if (require.main === module) {
  const command = process.argv[2]
  const runner = new MigrationRunner()

  switch (command) {
    case 'up':
    case 'migrate':
      runner.runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
      break
    
    case 'down':
    case 'rollback':
      const steps = parseInt(process.argv[3]) || 1
      runner.rollback(steps)
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
      break
    
    case 'status':
      runner.status()
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
      break
    
    case 'dry-run':
      runner.runMigrations({ dryRun: true })
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
      break
    
    default:
      console.log('Usage: tsx lib/migrations/migrate.ts [up|down|status|dry-run] [steps]')
      console.log('  up       - Run pending migrations')
      console.log('  down N   - Rollback N migrations (default: 1)')
      console.log('  status   - Show migration status')
      console.log('  dry-run  - Preview migrations without executing')
      break
  }
}