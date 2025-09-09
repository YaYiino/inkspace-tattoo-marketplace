# Comprehensive Software Architecture Best Practices
## Tattoo Marketplace Platform

This document defines comprehensive architecture patterns, standards, and practices for building a scalable, maintainable tattoo marketplace platform.

## Table of Contents
1. [Code Architecture Patterns](#1-code-architecture-patterns)
2. [API Design Excellence](#2-api-design-excellence)
3. [Data Architecture](#3-data-architecture)
4. [Testing Strategy](#4-testing-strategy)
5. [Code Quality & Standards](#5-code-quality--standards)
6. [Performance & Scalability](#6-performance--scalability)

---

## 1. Code Architecture Patterns

### 1.1 Domain-Driven Design (DDD) Implementation

#### Directory Structure
```
src/
├── domain/
│   ├── entities/
│   │   ├── Artist.ts
│   │   ├── TattooDesign.ts
│   │   ├── Booking.ts
│   │   └── User.ts
│   ├── value-objects/
│   │   ├── Money.ts
│   │   ├── Address.ts
│   │   └── TattooStyle.ts
│   ├── aggregates/
│   │   ├── ArtistProfile.ts
│   │   └── BookingSession.ts
│   ├── repositories/
│   │   ├── IArtistRepository.ts
│   │   └── IBookingRepository.ts
│   └── services/
│       ├── BookingService.ts
│       └── PaymentService.ts
├── application/
│   ├── commands/
│   ├── queries/
│   ├── handlers/
│   └── events/
├── infrastructure/
│   ├── database/
│   ├── external-apis/
│   └── messaging/
└── presentation/
    ├── components/
    ├── pages/
    └── api/
```

#### Entity Example
```typescript
// src/domain/entities/Artist.ts
import { Entity } from '@/lib/ddd/Entity';
import { ArtistId } from '@/domain/value-objects/ArtistId';
import { Email } from '@/domain/value-objects/Email';
import { TattooStyle } from '@/domain/value-objects/TattooStyle';

export interface ArtistProps {
  id: ArtistId;
  email: Email;
  name: string;
  bio: string;
  specialties: TattooStyle[];
  portfolioImages: string[];
  isVerified: boolean;
  rating: number;
  location: Address;
  createdAt: Date;
  updatedAt: Date;
}

export class Artist extends Entity<ArtistProps> {
  private constructor(props: ArtistProps) {
    super(props, props.id);
  }

  public static create(props: Omit<ArtistProps, 'id' | 'createdAt' | 'updatedAt'>): Artist {
    const id = ArtistId.generate();
    const now = new Date();
    
    return new Artist({
      ...props,
      id,
      createdAt: now,
      updatedAt: now,
    });
  }

  public updateBio(bio: string): void {
    this.props.bio = bio;
    this.props.updatedAt = new Date();
  }

  public addSpecialty(style: TattooStyle): void {
    if (!this.props.specialties.includes(style)) {
      this.props.specialties.push(style);
      this.props.updatedAt = new Date();
    }
  }

  public verify(): void {
    this.props.isVerified = true;
    this.props.updatedAt = new Date();
  }

  // Getters
  public get id(): ArtistId { return this.props.id; }
  public get email(): Email { return this.props.email; }
  public get name(): string { return this.props.name; }
  public get isVerified(): boolean { return this.props.isVerified; }
  public get specialties(): TattooStyle[] { return [...this.props.specialties]; }
}
```

#### Value Object Example
```typescript
// src/domain/value-objects/Money.ts
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    this.validateAmount(amount);
    this.validateCurrency(currency);
  }

  public static create(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  public add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  public multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  public equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  private validateAmount(amount: number): void {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
  }

  private validateCurrency(currency: string): void {
    const validCurrencies = ['USD', 'EUR', 'GBP'];
    if (!validCurrencies.includes(currency)) {
      throw new Error(`Invalid currency: ${currency}`);
    }
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error('Cannot perform operation with different currencies');
    }
  }
}
```

### 1.2 Clean Architecture Implementation

#### Application Service Example
```typescript
// src/application/services/BookingService.ts
import { IBookingRepository } from '@/domain/repositories/IBookingRepository';
import { IArtistRepository } from '@/domain/repositories/IArtistRepository';
import { IPaymentService } from '@/domain/services/IPaymentService';
import { IEventBus } from '@/application/events/IEventBus';
import { BookingCreatedEvent } from '@/domain/events/BookingCreatedEvent';

export class BookingService {
  constructor(
    private bookingRepository: IBookingRepository,
    private artistRepository: IArtistRepository,
    private paymentService: IPaymentService,
    private eventBus: IEventBus
  ) {}

  async createBooking(command: CreateBookingCommand): Promise<BookingId> {
    // Validate artist exists and is available
    const artist = await this.artistRepository.findById(command.artistId);
    if (!artist) {
      throw new Error('Artist not found');
    }

    // Check availability
    const isAvailable = await this.bookingRepository.isArtistAvailable(
      command.artistId,
      command.preferredDate
    );
    
    if (!isAvailable) {
      throw new Error('Artist is not available at the requested time');
    }

    // Create booking
    const booking = Booking.create({
      artistId: command.artistId,
      clientId: command.clientId,
      designId: command.designId,
      preferredDate: command.preferredDate,
      estimatedPrice: command.estimatedPrice,
      notes: command.notes,
    });

    // Process payment
    const paymentResult = await this.paymentService.processDeposit(
      booking.depositAmount,
      command.paymentMethod
    );

    if (!paymentResult.success) {
      throw new Error('Payment processing failed');
    }

    booking.confirmPayment(paymentResult.transactionId);

    // Save booking
    await this.bookingRepository.save(booking);

    // Publish event
    await this.eventBus.publish(
      new BookingCreatedEvent(booking.id, booking.artistId, booking.clientId)
    );

    return booking.id;
  }
}
```

### 1.3 SOLID Principles Application

#### Single Responsibility Principle (SRP)
```typescript
// ❌ Bad: Multiple responsibilities
class ArtistService {
  async createArtist(data: CreateArtistData) { /* ... */ }
  async sendWelcomeEmail(email: string) { /* ... */ }
  async uploadPortfolioImage(file: File) { /* ... */ }
  async calculateCommission(booking: Booking) { /* ... */ }
}

// ✅ Good: Single responsibility per class
class ArtistRegistrationService {
  async registerArtist(data: CreateArtistData): Promise<Artist> { /* ... */ }
}

class EmailNotificationService {
  async sendWelcomeEmail(artist: Artist): Promise<void> { /* ... */ }
}

class PortfolioImageService {
  async uploadImage(artistId: ArtistId, file: File): Promise<string> { /* ... */ }
}

class CommissionCalculator {
  calculate(booking: Booking): Money { /* ... */ }
}
```

#### Dependency Inversion Principle (DIP)
```typescript
// src/application/handlers/CreateArtistHandler.ts
export class CreateArtistHandler {
  constructor(
    private artistRepository: IArtistRepository, // Interface, not concrete
    private emailService: IEmailService,         // Interface, not concrete
    private imageService: IImageService          // Interface, not concrete
  ) {}

  async handle(command: CreateArtistCommand): Promise<ArtistId> {
    const artist = Artist.create(command);
    await this.artistRepository.save(artist);
    await this.emailService.sendWelcomeEmail(artist.email);
    return artist.id;
  }
}
```

### 1.4 Event-Driven Architecture Patterns

#### Domain Events
```typescript
// src/domain/events/DomainEvent.ts
export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor() {
    this.occurredOn = new Date();
    this.eventId = crypto.randomUUID();
  }

  abstract get eventName(): string;
}

// src/domain/events/BookingConfirmedEvent.ts
export class BookingConfirmedEvent extends DomainEvent {
  constructor(
    public readonly bookingId: BookingId,
    public readonly artistId: ArtistId,
    public readonly clientId: ClientId,
    public readonly scheduledDate: Date
  ) {
    super();
  }

  get eventName(): string {
    return 'booking.confirmed';
  }
}
```

#### Event Handler
```typescript
// src/application/handlers/BookingConfirmedHandler.ts
import { IEventHandler } from '@/application/events/IEventHandler';
import { BookingConfirmedEvent } from '@/domain/events/BookingConfirmedEvent';

export class BookingConfirmedHandler implements IEventHandler<BookingConfirmedEvent> {
  constructor(
    private emailService: IEmailService,
    private notificationService: INotificationService,
    private calendarService: ICalendarService
  ) {}

  async handle(event: BookingConfirmedEvent): Promise<void> {
    // Send confirmation emails
    await Promise.all([
      this.emailService.sendBookingConfirmationToClient(event.clientId, event.bookingId),
      this.emailService.sendBookingNotificationToArtist(event.artistId, event.bookingId),
    ]);

    // Send push notifications
    await this.notificationService.sendBookingConfirmation(event.clientId, event.bookingId);

    // Add to calendars
    await this.calendarService.createBookingEvent(event);
  }
}
```

---

## 2. API Design Excellence

### 2.1 RESTful API Design Standards

#### Resource Naming Conventions
```
GET    /api/v1/artists              # List artists
GET    /api/v1/artists/{id}         # Get specific artist
POST   /api/v1/artists              # Create artist
PUT    /api/v1/artists/{id}         # Update artist (full)
PATCH  /api/v1/artists/{id}         # Update artist (partial)
DELETE /api/v1/artists/{id}         # Delete artist

# Nested resources
GET    /api/v1/artists/{id}/portfolio     # Get artist's portfolio
POST   /api/v1/artists/{id}/portfolio     # Add to portfolio
GET    /api/v1/artists/{id}/bookings      # Get artist's bookings

# Complex operations
POST   /api/v1/bookings/{id}/confirm      # Confirm booking
POST   /api/v1/bookings/{id}/cancel       # Cancel booking
POST   /api/v1/artists/{id}/verify        # Verify artist
```

#### API Response Structure
```typescript
// src/types/api.ts
export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters?: Record<string, any>;
  };
  links?: {
    self: string;
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    path: string;
  };
}
```

#### Next.js API Route Example
```typescript
// app/api/v1/artists/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/types/api';
import { Artist } from '@/domain/entities/Artist';
import { GetArtistsQuery } from '@/application/queries/GetArtistsQuery';

const GetArtistsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  specialty: z.string().optional(),
  location: z.string().optional(),
  verified: z.coerce.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = GetArtistsSchema.parse(Object.fromEntries(searchParams));
    
    const queryHandler = new GetArtistsQueryHandler();
    const result = await queryHandler.handle(new GetArtistsQuery(query));

    const response: ApiResponse<Artist[]> = {
      data: result.artists,
      meta: {
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        },
        filters: {
          specialty: query.specialty,
          location: query.location,
          verified: query.verified,
        },
      },
      links: {
        self: request.url,
        next: query.page < Math.ceil(result.total / query.limit) 
          ? `${request.nextUrl.pathname}?page=${query.page + 1}&limit=${query.limit}` 
          : undefined,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
            timestamp: new Date().toISOString(),
            path: request.nextUrl.pathname,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          path: request.nextUrl.pathname,
        },
      },
      { status: 500 }
    );
  }
}
```

### 2.2 API Versioning Strategy

#### URL-based Versioning
```typescript
// app/api/v1/artists/route.ts
// app/api/v2/artists/route.ts

// Middleware for version handling
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Default to v1 if no version specified
  if (pathname.startsWith('/api/') && !pathname.match(/\/v\d+\//)) {
    return NextResponse.redirect(
      new URL(pathname.replace('/api/', '/api/v1/'), request.url)
    );
  }

  // Add version header
  const version = pathname.match(/\/v(\d+)\//)?.[1] || '1';
  const response = NextResponse.next();
  response.headers.set('API-Version', version);
  
  return response;
}
```

### 2.3 Rate Limiting Implementation

```typescript
// lib/rate-limiter.ts
import { Redis } from 'ioredis';
import { NextRequest } from 'next/server';

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: Date;
}

export class RateLimiter {
  constructor(private redis: Redis) {}

  async limit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;

    const current = await this.redis.incr(redisKey);
    
    if (current === 1) {
      await this.redis.expire(redisKey, Math.ceil(windowMs / 1000));
    }

    const remaining = Math.max(0, limit - current);
    const reset = new Date((window + 1) * windowMs);

    return {
      success: current <= limit,
      remaining,
      reset,
    };
  }

  async getRemainingRequests(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    const current = await this.redis.get(redisKey);
    return current ? parseInt(current) : 0;
  }
}

// Rate limiting middleware
export function withRateLimit(
  limit: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    context: any
  ) {
    const rateLimiter = new RateLimiter(redis);
    const clientIp = request.ip || 'anonymous';
    const key = `api:${clientIp}`;

    const result = await rateLimiter.limit(key, limit, windowMs);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toISOString(),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = await context.handler(request, context);
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toISOString());

    return response;
  };
}
```

---

## 3. Data Architecture

### 3.1 Database Design Patterns

#### Repository Pattern Implementation
```typescript
// src/infrastructure/repositories/PrismaArtistRepository.ts
import { PrismaClient } from '@prisma/client';
import { IArtistRepository } from '@/domain/repositories/IArtistRepository';
import { Artist } from '@/domain/entities/Artist';
import { ArtistId } from '@/domain/value-objects/ArtistId';

export class PrismaArtistRepository implements IArtistRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: ArtistId): Promise<Artist | null> {
    const data = await this.prisma.artist.findUnique({
      where: { id: id.value },
      include: {
        portfolioImages: true,
        specialties: true,
      },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByEmail(email: string): Promise<Artist | null> {
    const data = await this.prisma.artist.findUnique({
      where: { email },
      include: {
        portfolioImages: true,
        specialties: true,
      },
    });

    return data ? this.toDomain(data) : null;
  }

  async save(artist: Artist): Promise<void> {
    const data = this.toPersistence(artist);
    
    await this.prisma.artist.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findManyBySpecialty(
    specialty: string,
    limit: number,
    offset: number
  ): Promise<{ artists: Artist[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.artist.findMany({
        where: {
          specialties: {
            some: { name: specialty },
          },
        },
        skip: offset,
        take: limit,
        include: {
          portfolioImages: true,
          specialties: true,
        },
      }),
      this.prisma.artist.count({
        where: {
          specialties: {
            some: { name: specialty },
          },
        },
      }),
    ]);

    return {
      artists: data.map(this.toDomain),
      total,
    };
  }

  private toDomain(data: any): Artist {
    // Map Prisma model to domain entity
    return Artist.reconstitute({
      id: ArtistId.create(data.id),
      email: Email.create(data.email),
      name: data.name,
      bio: data.bio,
      specialties: data.specialties.map((s: any) => TattooStyle.create(s.name)),
      portfolioImages: data.portfolioImages.map((img: any) => img.url),
      isVerified: data.isVerified,
      rating: data.rating,
      location: Address.create(data.address),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private toPersistence(artist: Artist): any {
    // Map domain entity to Prisma model
    return {
      id: artist.id.value,
      email: artist.email.value,
      name: artist.name,
      bio: artist.bio,
      isVerified: artist.isVerified,
      rating: artist.rating,
      address: artist.location.toString(),
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt,
    };
  }
}
```

### 3.2 CQRS Implementation

#### Query Handler Example
```typescript
// src/application/queries/GetArtistPortfolioQuery.ts
export class GetArtistPortfolioQuery {
  constructor(
    public readonly artistId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

// src/application/handlers/GetArtistPortfolioHandler.ts
import { IQueryHandler } from '@/application/queries/IQueryHandler';
import { GetArtistPortfolioQuery } from '@/application/queries/GetArtistPortfolioQuery';

export class GetArtistPortfolioHandler 
  implements IQueryHandler<GetArtistPortfolioQuery, PortfolioResult> {
  
  constructor(
    private portfolioReadModel: IPortfolioReadModel,
    private cacheService: ICacheService
  ) {}

  async handle(query: GetArtistPortfolioQuery): Promise<PortfolioResult> {
    const cacheKey = `portfolio:${query.artistId}:${query.page}:${query.limit}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query read model
    const result = await this.portfolioReadModel.getArtistPortfolio({
      artistId: query.artistId,
      offset: (query.page - 1) * query.limit,
      limit: query.limit,
    });

    // Cache result
    await this.cacheService.set(cacheKey, result, 300); // 5 minutes

    return result;
  }
}
```

#### Command Handler Example
```typescript
// src/application/commands/UpdateArtistProfileCommand.ts
export class UpdateArtistProfileCommand {
  constructor(
    public readonly artistId: string,
    public readonly bio: string,
    public readonly specialties: string[],
    public readonly portfolioImages: string[]
  ) {}
}

// src/application/handlers/UpdateArtistProfileHandler.ts
export class UpdateArtistProfileHandler 
  implements ICommandHandler<UpdateArtistProfileCommand, void> {
  
  constructor(
    private artistRepository: IArtistRepository,
    private eventBus: IEventBus
  ) {}

  async handle(command: UpdateArtistProfileCommand): Promise<void> {
    const artist = await this.artistRepository.findById(
      ArtistId.create(command.artistId)
    );

    if (!artist) {
      throw new Error('Artist not found');
    }

    // Update artist
    artist.updateBio(command.bio);
    command.specialties.forEach(specialty => 
      artist.addSpecialty(TattooStyle.create(specialty))
    );

    await this.artistRepository.save(artist);

    // Publish event for read model updates
    await this.eventBus.publish(
      new ArtistProfileUpdatedEvent(artist.id, command.bio, command.specialties)
    );
  }
}
```

### 3.3 Caching Strategies

#### Multi-Level Caching
```typescript
// src/infrastructure/caching/CacheService.ts
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export class MultiLevelCacheService implements ICacheService {
  constructor(
    private memoryCache: Map<string, { value: any; expires: number }>,
    private redisCache: Redis,
    private defaultTtl: number = 300
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // L1: Memory cache
    const memoryResult = this.getFromMemory<T>(key);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // L2: Redis cache
    const redisResult = await this.getFromRedis<T>(key);
    if (redisResult !== null) {
      // Populate memory cache
      this.setInMemory(key, redisResult, this.defaultTtl);
      return redisResult;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds = this.defaultTtl): Promise<void> {
    // Set in both caches
    await Promise.all([
      this.setInMemory(key, value, ttlSeconds),
      this.setInRedis(key, value, ttlSeconds),
    ]);
  }

  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return item.value;
  }

  private setInMemory<T>(key: string, value: T, ttlSeconds: number): void {
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000),
    });
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    const result = await this.redisCache.get(key);
    return result ? JSON.parse(result) : null;
  }

  private async setInRedis<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redisCache.setex(key, ttlSeconds, JSON.stringify(value));
  }
}
```

#### Cache-Aside Pattern
```typescript
// src/application/services/ArtistSearchService.ts
export class ArtistSearchService {
  constructor(
    private artistRepository: IArtistRepository,
    private cacheService: ICacheService,
    private searchIndex: ISearchIndex
  ) {}

  async searchArtists(criteria: SearchCriteria): Promise<SearchResult> {
    const cacheKey = this.buildCacheKey(criteria);
    
    // Try cache first
    const cached = await this.cacheService.get<SearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Search in index
    const results = await this.searchIndex.search(criteria);
    
    // Cache results
    await this.cacheService.set(cacheKey, results, 600); // 10 minutes
    
    return results;
  }

  async invalidateArtistCache(artistId: ArtistId): Promise<void> {
    // Invalidate all cache entries related to this artist
    await this.cacheService.invalidatePattern(`artist:${artistId.value}:*`);
    await this.cacheService.invalidatePattern(`search:*`); // Invalidate search cache
  }

  private buildCacheKey(criteria: SearchCriteria): string {
    const parts = [
      'search',
      criteria.location || 'any',
      criteria.specialty || 'any',
      criteria.priceRange || 'any',
      criteria.page.toString(),
      criteria.limit.toString(),
    ];
    return parts.join(':');
  }
}
```

---

## 4. Testing Strategy

### 4.1 Test Pyramid Implementation

#### Unit Tests Example
```typescript
// src/domain/entities/__tests__/Artist.test.ts
import { Artist } from '../Artist';
import { Email } from '@/domain/value-objects/Email';
import { TattooStyle } from '@/domain/value-objects/TattooStyle';
import { Address } from '@/domain/value-objects/Address';

describe('Artist Entity', () => {
  const validArtistData = {
    email: Email.create('artist@example.com'),
    name: 'John Doe',
    bio: 'Experienced tattoo artist',
    specialties: [TattooStyle.create('Traditional')],
    portfolioImages: [],
    isVerified: false,
    rating: 4.5,
    location: Address.create('123 Main St, City, State'),
  };

  describe('create', () => {
    it('should create a new artist with valid data', () => {
      const artist = Artist.create(validArtistData);
      
      expect(artist.name).toBe('John Doe');
      expect(artist.email.value).toBe('artist@example.com');
      expect(artist.isVerified).toBe(false);
      expect(artist.specialties).toHaveLength(1);
    });

    it('should generate unique IDs for different artists', () => {
      const artist1 = Artist.create(validArtistData);
      const artist2 = Artist.create(validArtistData);
      
      expect(artist1.id.value).not.toBe(artist2.id.value);
    });
  });

  describe('updateBio', () => {
    it('should update bio and timestamp', () => {
      const artist = Artist.create(validArtistData);
      const originalUpdatedAt = artist.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        artist.updateBio('New bio');
        
        expect(artist.bio).toBe('New bio');
        expect(artist.updatedAt).toBeInstanceOf(Date);
        expect(artist.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });
  });

  describe('addSpecialty', () => {
    it('should add new specialty', () => {
      const artist = Artist.create(validArtistData);
      const newSpecialty = TattooStyle.create('Realism');
      
      artist.addSpecialty(newSpecialty);
      
      expect(artist.specialties).toContain(newSpecialty);
    });

    it('should not add duplicate specialty', () => {
      const artist = Artist.create(validArtistData);
      const existingSpecialty = TattooStyle.create('Traditional');
      
      artist.addSpecialty(existingSpecialty);
      
      expect(artist.specialties.filter(s => s.equals(existingSpecialty))).toHaveLength(1);
    });
  });
});
```

#### Integration Tests Example
```typescript
// src/application/handlers/__tests__/CreateBookingHandler.integration.test.ts
import { CreateBookingHandler } from '../CreateBookingHandler';
import { CreateBookingCommand } from '@/application/commands/CreateBookingCommand';
import { TestDatabase } from '@/test-utils/TestDatabase';
import { TestEventBus } from '@/test-utils/TestEventBus';

describe('CreateBookingHandler Integration', () => {
  let handler: CreateBookingHandler;
  let testDb: TestDatabase;
  let eventBus: TestEventBus;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
    
    eventBus = new TestEventBus();
    
    handler = new CreateBookingHandler(
      testDb.bookingRepository,
      testDb.artistRepository,
      testDb.paymentService,
      eventBus
    );
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.reset();
    eventBus.clear();
  });

  describe('handle', () => {
    it('should create booking successfully with valid data', async () => {
      // Arrange
      const artist = await testDb.createTestArtist();
      const client = await testDb.createTestClient();
      const command = new CreateBookingCommand({
        artistId: artist.id.value,
        clientId: client.id.value,
        designId: 'design-123',
        preferredDate: new Date('2024-12-01'),
        estimatedPrice: Money.create(200, 'USD'),
        notes: 'Test booking',
        paymentMethod: 'card_123',
      });

      // Act
      const bookingId = await handler.handle(command);

      // Assert
      expect(bookingId).toBeDefined();
      
      const savedBooking = await testDb.bookingRepository.findById(bookingId);
      expect(savedBooking).toBeTruthy();
      expect(savedBooking!.artistId.value).toBe(artist.id.value);
      
      // Verify event was published
      expect(eventBus.publishedEvents).toHaveLength(1);
      expect(eventBus.publishedEvents[0]).toBeInstanceOf(BookingCreatedEvent);
    });

    it('should throw error when artist is not available', async () => {
      // Arrange
      const artist = await testDb.createTestArtist();
      const client = await testDb.createTestClient();
      const date = new Date('2024-12-01');
      
      // Create existing booking for the same time
      await testDb.createTestBooking({
        artistId: artist.id,
        scheduledDate: date,
      });

      const command = new CreateBookingCommand({
        artistId: artist.id.value,
        clientId: client.id.value,
        designId: 'design-123',
        preferredDate: date,
        estimatedPrice: Money.create(200, 'USD'),
        notes: 'Test booking',
        paymentMethod: 'card_123',
      });

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow(
        'Artist is not available at the requested time'
      );
    });
  });
});
```

### 4.2 Test-Driven Development (TDD) Example

```typescript
// First, write the failing test
describe('Money Value Object', () => {
  describe('add', () => {
    it('should add two money amounts with same currency', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');
      
      const result = money1.add(money2);
      
      expect(result.amount).toBe(150);
      expect(result.currency).toBe('USD');
    });

    it('should throw error when adding different currencies', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'EUR');
      
      expect(() => money1.add(money2)).toThrow(
        'Cannot perform operation with different currencies'
      );
    });
  });
});

// Then implement the minimum code to make it pass
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {}

  static create(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot perform operation with different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

### 4.3 Contract Testing for APIs

```typescript
// src/tests/contracts/artist-api.contract.test.ts
import { pactWith } from 'jest-pact';
import { Interaction } from '@pact-foundation/pact';
import { ArtistApiClient } from '@/infrastructure/api/ArtistApiClient';

pactWith({ consumer: 'TattooMarketplaceWeb', provider: 'ArtistService' }, provider => {
  describe('Artist API Contract', () => {
    let apiClient: ArtistApiClient;

    beforeEach(() => {
      apiClient = new ArtistApiClient(provider.mockService.baseUrl);
    });

    describe('GET /artists/{id}', () => {
      it('should return artist details', async () => {
        // Arrange
        const artistId = '123';
        const expectedArtist = {
          id: artistId,
          name: 'John Doe',
          email: 'john@example.com',
          bio: 'Experienced artist',
          specialties: ['Traditional', 'Realism'],
          isVerified: true,
          rating: 4.8,
        };

        const interaction: Interaction = {
          state: 'artist with id 123 exists',
          uponReceiving: 'a request for artist details',
          withRequest: {
            method: 'GET',
            path: '/api/v1/artists/123',
            headers: {
              'Accept': 'application/json',
            },
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              data: expectedArtist,
            },
          },
        };

        await provider.addInteraction(interaction);

        // Act
        const result = await apiClient.getArtist(artistId);

        // Assert
        expect(result.data).toMatchObject(expectedArtist);
      });
    });
  });
});
```

---

## 5. Code Quality & Standards

### 5.1 ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'warn',
    
    // Domain modeling rules
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    
    // Clean code rules
    'max-len': ['error', { code: 100 }],
    'max-lines-per-function': ['error', { max: 50 }],
    'complexity': ['error', 10],
    
    // Import organization
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
      },
    ],
  },
};
```

### 5.2 Prettier Configuration

```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
};
```

### 5.3 Code Review Checklist

```typescript
// src/utils/code-review-checklist.ts

/**
 * Code Review Checklist for Tattoo Marketplace
 * 
 * ARCHITECTURE & DESIGN
 * □ Follows domain-driven design principles
 * □ Proper separation of concerns
 * □ SOLID principles applied
 * □ Appropriate design patterns used
 * □ No circular dependencies
 * 
 * CODE QUALITY
 * □ Functions are small and focused (< 50 lines)
 * □ Variables and functions have descriptive names
 * □ No magic numbers or strings
 * □ Error handling is comprehensive
 * □ No code duplication
 * 
 * TESTING
 * □ Unit tests cover critical paths
 * □ Integration tests for API endpoints
 * □ Mocks are used appropriately
 * □ Test names are descriptive
 * □ Edge cases are tested
 * 
 * SECURITY
 * □ Input validation implemented
 * □ SQL injection prevention
 * □ XSS protection
 * □ Authentication/authorization checks
 * □ Sensitive data not logged
 * 
 * PERFORMANCE
 * □ Database queries optimized
 * □ Appropriate caching strategy
 * □ No N+1 query problems
 * □ Large datasets paginated
 * □ Images optimized
 * 
 * DOCUMENTATION
 * □ Public APIs documented
 * □ Complex business logic explained
 * □ README updated if needed
 * □ ADRs created for significant decisions
 */
```

### 5.4 Technical Debt Management

```typescript
// src/utils/technical-debt.ts

/**
 * Technical Debt Classification
 */
export enum TechnicalDebtType {
  DELIBERATE_PRUDENT = 'deliberate-prudent',
  DELIBERATE_RECKLESS = 'deliberate-reckless', 
  INADVERTENT_PRUDENT = 'inadvertent-prudent',
  INADVERTENT_RECKLESS = 'inadvertent-reckless',
}

export interface TechnicalDebtItem {
  id: string;
  type: TechnicalDebtType;
  description: string;
  location: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  effort: 'small' | 'medium' | 'large';
  createdAt: Date;
  resolvedAt?: Date;
}

/**
 * Example technical debt annotations
 */

// TODO: [DEBT-001] Refactor this method to use proper dependency injection
// Type: INADVERTENT_RECKLESS, Impact: MEDIUM, Effort: SMALL
// Created: 2024-01-15, Deadline: 2024-02-15
export class LegacyBookingService {
  createBooking() {
    // Direct database access - should use repository pattern
    const db = new Database();
    // ... implementation
  }
}

// FIXME: [DEBT-002] Replace this quick fix with proper error handling
// Type: DELIBERATE_PRUDENT, Impact: HIGH, Effort: MEDIUM  
// Created: 2024-01-20, Deadline: 2024-03-01
export function processPayment(amount: number) {
  try {
    // ... payment processing
  } catch (error) {
    // Quick fix to prevent crashes - needs proper error handling
    console.error('Payment failed:', error);
    return { success: false };
  }
}
```

---

## 6. Performance & Scalability

### 6.1 Caching Strategies

#### Redis Caching Implementation
```typescript
// src/infrastructure/caching/RedisCache.ts
import Redis from 'ioredis';

export class RedisCacheService implements ICacheService {
  private redis: Redis;

  constructor(config: RedisConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null; // Fail gracefully
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw - caching is not critical for functionality
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}
```

### 6.2 Database Optimization

#### Query Optimization
```typescript
// src/infrastructure/repositories/OptimizedArtistRepository.ts
export class OptimizedArtistRepository implements IArtistRepository {
  async findArtistsWithPortfolio(
    filters: ArtistFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Artist>> {
    // Optimized query with proper indexing and joins
    const query = this.prisma.artist.findMany({
      where: {
        AND: [
          filters.location ? {
            location: {
              contains: filters.location,
              mode: 'insensitive',
            },
          } : {},
          filters.specialties?.length ? {
            specialties: {
              some: {
                name: {
                  in: filters.specialties,
                },
              },
            },
          } : {},
          filters.verified !== undefined ? {
            isVerified: filters.verified,
          } : {},
          filters.minRating ? {
            rating: {
              gte: filters.minRating,
            },
          } : {},
        ],
      },
      include: {
        portfolioImages: {
          take: 5, // Limit portfolio images to reduce payload
          orderBy: { createdAt: 'desc' },
        },
        specialties: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
      skip: pagination.offset,
      take: pagination.limit,
      orderBy: [
        { isVerified: 'desc' }, // Verified artists first
        { rating: 'desc' },     // Then by rating
        { createdAt: 'desc' },  // Then by recency
      ],
    });

    const countQuery = this.prisma.artist.count({
      where: query.where,
    });

    const [artists, total] = await Promise.all([query, countQuery]);

    return {
      data: artists.map(this.toDomain),
      total,
      page: pagination.page,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  // Bulk operations for better performance
  async bulkUpdateArtistRatings(updates: Array<{id: string, rating: number}>): Promise<void> {
    const transaction = updates.map(update => 
      this.prisma.artist.update({
        where: { id: update.id },
        data: { 
          rating: update.rating,
          updatedAt: new Date(),
        },
      })
    );

    await this.prisma.$transaction(transaction);
  }
}
```

### 6.3 Image Optimization

```typescript
// src/infrastructure/storage/ImageOptimizationService.ts
import sharp from 'sharp';

export class ImageOptimizationService {
  async optimizeAndStore(
    file: File,
    options: ImageOptimizationOptions
  ): Promise<OptimizedImageResult> {
    const buffer = await file.arrayBuffer();
    
    // Generate multiple sizes for responsive images
    const sizes = [
      { width: 150, height: 150, suffix: 'thumb' },
      { width: 400, height: 400, suffix: 'medium' },
      { width: 800, height: 800, suffix: 'large' },
    ];

    const optimizedImages = await Promise.all(
      sizes.map(async size => {
        const optimized = await sharp(buffer)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 85 }) // WebP for better compression
          .toBuffer();

        const key = `${options.folder}/${options.filename}-${size.suffix}.webp`;
        const url = await this.uploadToS3(key, optimized);

        return {
          size: size.suffix,
          url,
          width: size.width,
          height: size.height,
        };
      })
    );

    return {
      original: file.name,
      optimized: optimizedImages,
      totalSize: optimizedImages.reduce((acc, img) => acc + img.width * img.height, 0),
    };
  }

  private async uploadToS3(key: string, buffer: Buffer): Promise<string> {
    // S3 upload implementation
    // Return CDN URL
  }
}
```

### 6.4 Performance Monitoring

```typescript
// src/infrastructure/monitoring/PerformanceMonitor.ts
export class PerformanceMonitor {
  static measureExecutionTime<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      
      try {
        const result = await fn();
        const executionTime = performance.now() - startTime;
        
        // Log slow operations
        if (executionTime > 1000) {
          console.warn(`Slow operation detected: ${operation} took ${executionTime}ms`);
        }
        
        // Send metrics to monitoring service
        this.recordMetric(`operation.${operation}.duration`, executionTime);
        this.recordMetric(`operation.${operation}.success`, 1);
        
        resolve(result);
      } catch (error) {
        const executionTime = performance.now() - startTime;
        this.recordMetric(`operation.${operation}.duration`, executionTime);
        this.recordMetric(`operation.${operation}.error`, 1);
        reject(error);
      }
    });
  }

  private static recordMetric(name: string, value: number): void {
    // Send to monitoring service (DataDog, New Relic, etc.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'timing_complete', {
        name,
        value: Math.round(value),
      });
    }
  }
}

// Usage example
export class BookingService {
  async createBooking(command: CreateBookingCommand): Promise<BookingId> {
    return PerformanceMonitor.measureExecutionTime('create_booking', async () => {
      // Implementation here
      return bookingId;
    });
  }
}
```

### 6.5 Load Testing Configuration

```typescript
// src/tests/load/artist-search.load.test.ts
import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
  },
};

const BASE_URL = 'https://api.tattoo-marketplace.com';

export default function () {
  // Test artist search endpoint
  const searchParams = {
    location: 'New York',
    specialty: 'Traditional',
    page: Math.floor(Math.random() * 10) + 1,
    limit: 20,
  };

  const searchResponse = http.get(
    `${BASE_URL}/api/v1/artists?${new URLSearchParams(searchParams)}`
  );

  check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500,
    'search has results': (r) => JSON.parse(r.body).data.length > 0,
  });

  // Test individual artist detail
  if (searchResponse.status === 200) {
    const searchData = JSON.parse(searchResponse.body);
    if (searchData.data.length > 0) {
      const randomArtist = searchData.data[Math.floor(Math.random() * searchData.data.length)];
      
      const detailResponse = http.get(`${BASE_URL}/api/v1/artists/${randomArtist.id}`);
      
      check(detailResponse, {
        'detail status is 200': (r) => r.status === 200,
        'detail response time < 300ms': (r) => r.timings.duration < 300,
      });
    }
  }

  sleep(1);
}
```

This comprehensive architecture guide provides the foundation for building a scalable, maintainable tattoo marketplace platform. Each section includes practical examples and can be implemented incrementally as the platform grows.