# Implementation Examples
## Practical Code Templates and Patterns

This document provides concrete implementation examples for the tattoo marketplace platform architecture patterns.

## Table of Contents
1. [Domain Layer Implementation](#1-domain-layer-implementation)
2. [Application Layer Examples](#2-application-layer-examples)
3. [Infrastructure Implementation](#3-infrastructure-implementation)
4. [API Layer Patterns](#4-api-layer-patterns)
5. [Testing Implementation](#5-testing-implementation)

---

## 1. Domain Layer Implementation

### Base Classes and Interfaces

```typescript
// src/lib/ddd/Entity.ts
export abstract class Entity<T> {
  protected readonly props: T;
  protected readonly _id: string;

  protected constructor(props: T, id: string) {
    this.props = props;
    this._id = id;
  }

  public equals(entity: Entity<T>): boolean {
    if (!(entity instanceof this.constructor)) {
      return false;
    }
    return entity._id === this._id;
  }

  public get id(): string {
    return this._id;
  }
}

// src/lib/ddd/ValueObject.ts
export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  public equals(vo: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

// src/lib/ddd/AggregateRoot.ts
import { DomainEvent } from './DomainEvent';

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public getDomainEvents(): DomainEvent[] {
    return this._domainEvents.slice();
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
```

### Complete Entity Example

```typescript
// src/domain/entities/TattooDesign.ts
import { Entity } from '@/lib/ddd/Entity';
import { TattooDesignId } from '@/domain/value-objects/TattooDesignId';
import { Money } from '@/domain/value-objects/Money';
import { TattooStyle } from '@/domain/value-objects/TattooStyle';

export interface TattooDesignProps {
  id: TattooDesignId;
  artistId: string;
  title: string;
  description: string;
  style: TattooStyle;
  images: string[];
  price: Money;
  estimatedHours: number;
  size: 'small' | 'medium' | 'large' | 'xl';
  placement: string[];
  isAvailable: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class TattooDesign extends Entity<TattooDesignProps> {
  private constructor(props: TattooDesignProps) {
    super(props, props.id.value);
  }

  public static create(
    props: Omit<TattooDesignProps, 'id' | 'createdAt' | 'updatedAt' | 'isAvailable'>
  ): TattooDesign {
    const id = TattooDesignId.generate();
    const now = new Date();

    const design = new TattooDesign({
      ...props,
      id,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    });

    return design;
  }

  public updatePrice(newPrice: Money): void {
    this.ensureDesignIsAvailable();
    this.props.price = newPrice;
    this.props.updatedAt = new Date();
  }

  public addImage(imageUrl: string): void {
    if (this.props.images.length >= 10) {
      throw new Error('Maximum of 10 images allowed per design');
    }
    
    this.props.images.push(imageUrl);
    this.props.updatedAt = new Date();
  }

  public makeUnavailable(): void {
    this.props.isAvailable = false;
    this.props.updatedAt = new Date();
  }

  public calculateTotalCost(): Money {
    const hourlyRate = Money.create(100, this.props.price.currency);
    return hourlyRate.multiply(this.props.estimatedHours);
  }

  private ensureDesignIsAvailable(): void {
    if (!this.props.isAvailable) {
      throw new Error('Cannot modify unavailable design');
    }
  }

  // Getters
  public get id(): TattooDesignId { return this.props.id; }
  public get artistId(): string { return this.props.artistId; }
  public get title(): string { return this.props.title; }
  public get price(): Money { return this.props.price; }
  public get style(): TattooStyle { return this.props.style; }
  public get images(): string[] { return [...this.props.images]; }
  public get isAvailable(): boolean { return this.props.isAvailable; }
  public get estimatedHours(): number { return this.props.estimatedHours; }
}
```

### Aggregate Root Example

```typescript
// src/domain/aggregates/BookingSession.ts
import { AggregateRoot } from '@/lib/ddd/AggregateRoot';
import { BookingSessionId } from '@/domain/value-objects/BookingSessionId';
import { BookingCreatedEvent } from '@/domain/events/BookingCreatedEvent';
import { BookingConfirmedEvent } from '@/domain/events/BookingConfirmedEvent';
import { BookingCancelledEvent } from '@/domain/events/BookingCancelledEvent';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface BookingSessionProps {
  id: BookingSessionId;
  artistId: string;
  clientId: string;
  designId?: string;
  scheduledDate: Date;
  estimatedDuration: number;
  totalPrice: Money;
  depositAmount: Money;
  status: BookingStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BookingSession extends AggregateRoot<BookingSessionProps> {
  private constructor(props: BookingSessionProps) {
    super(props, props.id.value);
  }

  public static create(
    props: Omit<BookingSessionProps, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): BookingSession {
    const id = BookingSessionId.generate();
    const now = new Date();

    const session = new BookingSession({
      ...props,
      id,
      status: BookingStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });

    // Add domain event
    session.addDomainEvent(
      new BookingCreatedEvent(
        session.id,
        session.artistId,
        session.clientId,
        session.scheduledDate,
        session.totalPrice
      )
    );

    return session;
  }

  public confirm(): void {
    this.ensureCanBeConfirmed();
    
    this.props.status = BookingStatus.CONFIRMED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BookingConfirmedEvent(
        this.props.id,
        this.props.artistId,
        this.props.clientId,
        this.props.scheduledDate
      )
    );
  }

  public cancel(reason: string): void {
    this.ensureCanBeCancelled();

    this.props.status = BookingStatus.CANCELLED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BookingCancelledEvent(
        this.props.id,
        this.props.artistId,
        this.props.clientId,
        reason
      )
    );
  }

  public reschedule(newDate: Date): void {
    this.ensureCanBeRescheduled();
    
    const oldDate = this.props.scheduledDate;
    this.props.scheduledDate = newDate;
    this.props.updatedAt = new Date();

    // Events for rescheduling...
  }

  private ensureCanBeConfirmed(): void {
    if (this.props.status !== BookingStatus.PENDING) {
      throw new Error(`Cannot confirm booking with status: ${this.props.status}`);
    }

    const now = new Date();
    if (this.props.scheduledDate <= now) {
      throw new Error('Cannot confirm booking for past date');
    }
  }

  private ensureCanBeCancelled(): void {
    const allowedStatuses = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
    if (!allowedStatuses.includes(this.props.status)) {
      throw new Error(`Cannot cancel booking with status: ${this.props.status}`);
    }
  }

  private ensureCanBeRescheduled(): void {
    if (this.props.status === BookingStatus.CANCELLED) {
      throw new Error('Cannot reschedule cancelled booking');
    }
  }

  // Getters
  public get id(): BookingSessionId { return this.props.id; }
  public get status(): BookingStatus { return this.props.status; }
  public get artistId(): string { return this.props.artistId; }
  public get clientId(): string { return this.props.clientId; }
  public get scheduledDate(): Date { return this.props.scheduledDate; }
  public get totalPrice(): Money { return this.props.totalPrice; }
  public get isConfirmed(): boolean { return this.props.status === BookingStatus.CONFIRMED; }
}
```

---

## 2. Application Layer Examples

### Command/Query Handlers

```typescript
// src/application/commands/CreateTattooDesignCommand.ts
export class CreateTattooDesignCommand {
  constructor(
    public readonly artistId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly style: string,
    public readonly images: string[],
    public readonly price: { amount: number; currency: string },
    public readonly estimatedHours: number,
    public readonly size: string,
    public readonly placement: string[],
    public readonly tags: string[]
  ) {}
}

// src/application/handlers/CreateTattooDesignHandler.ts
import { ICommandHandler } from '@/application/interfaces/ICommandHandler';
import { CreateTattooDesignCommand } from '@/application/commands/CreateTattooDesignCommand';
import { ITattooDesignRepository } from '@/domain/repositories/ITattooDesignRepository';
import { IArtistRepository } from '@/domain/repositories/IArtistRepository';

export class CreateTattooDesignHandler implements ICommandHandler<CreateTattooDesignCommand, string> {
  constructor(
    private tattooDesignRepository: ITattooDesignRepository,
    private artistRepository: IArtistRepository
  ) {}

  async handle(command: CreateTattooDesignCommand): Promise<string> {
    // Verify artist exists
    const artist = await this.artistRepository.findById(command.artistId);
    if (!artist) {
      throw new Error('Artist not found');
    }

    if (!artist.isVerified) {
      throw new Error('Only verified artists can create designs');
    }

    // Create design
    const design = TattooDesign.create({
      artistId: command.artistId,
      title: command.title,
      description: command.description,
      style: TattooStyle.create(command.style),
      images: command.images,
      price: Money.create(command.price.amount, command.price.currency),
      estimatedHours: command.estimatedHours,
      size: command.size as any,
      placement: command.placement,
      tags: command.tags,
    });

    await this.tattooDesignRepository.save(design);

    return design.id.value;
  }
}
```

### Query Implementation

```typescript
// src/application/queries/GetArtistDesignsQuery.ts
export class GetArtistDesignsQuery {
  constructor(
    public readonly artistId: string,
    public readonly style?: string,
    public readonly minPrice?: number,
    public readonly maxPrice?: number,
    public readonly size?: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

// src/application/handlers/GetArtistDesignsHandler.ts
import { IQueryHandler } from '@/application/interfaces/IQueryHandler';

export interface DesignSummary {
  id: string;
  title: string;
  style: string;
  price: { amount: number; currency: string };
  thumbnailImage: string;
  estimatedHours: number;
  size: string;
}

export interface GetArtistDesignsResult {
  designs: DesignSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export class GetArtistDesignsHandler implements IQueryHandler<GetArtistDesignsQuery, GetArtistDesignsResult> {
  constructor(
    private designReadModel: IDesignReadModel,
    private cacheService: ICacheService
  ) {}

  async handle(query: GetArtistDesignsQuery): Promise<GetArtistDesignsResult> {
    const cacheKey = this.buildCacheKey(query);
    
    // Try cache first
    const cached = await this.cacheService.get<GetArtistDesignsResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build filters
    const filters: DesignFilters = {
      artistId: query.artistId,
      style: query.style,
      priceRange: query.minPrice || query.maxPrice ? {
        min: query.minPrice,
        max: query.maxPrice,
      } : undefined,
      size: query.size,
      isAvailable: true,
    };

    // Execute query
    const result = await this.designReadModel.findDesigns({
      filters,
      pagination: {
        page: query.page,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to DTO
    const response: GetArtistDesignsResult = {
      designs: result.designs.map(design => ({
        id: design.id,
        title: design.title,
        style: design.style,
        price: {
          amount: design.price,
          currency: design.currency,
        },
        thumbnailImage: design.images[0] || '',
        estimatedHours: design.estimatedHours,
        size: design.size,
      })),
      total: result.total,
      page: query.page,
      totalPages: Math.ceil(result.total / query.limit),
    };

    // Cache result
    await this.cacheService.set(cacheKey, response, 300); // 5 minutes

    return response;
  }

  private buildCacheKey(query: GetArtistDesignsQuery): string {
    const keyParts = [
      'artist-designs',
      query.artistId,
      query.style || 'any',
      `${query.minPrice || 0}-${query.maxPrice || 'max'}`,
      query.size || 'any',
      `page-${query.page}`,
      `limit-${query.limit}`,
    ];
    return keyParts.join(':');
  }
}
```

### Event Handler

```typescript
// src/application/handlers/BookingConfirmedHandler.ts
import { IEventHandler } from '@/application/interfaces/IEventHandler';
import { BookingConfirmedEvent } from '@/domain/events/BookingConfirmedEvent';

export class BookingConfirmedHandler implements IEventHandler<BookingConfirmedEvent> {
  constructor(
    private emailService: IEmailService,
    private notificationService: INotificationService,
    private calendarService: ICalendarService,
    private paymentService: IPaymentService
  ) {}

  async handle(event: BookingConfirmedEvent): Promise<void> {
    const bookingId = event.bookingId.value;
    
    try {
      // Parallel execution of independent tasks
      await Promise.all([
        this.sendNotifications(event),
        this.createCalendarEvents(event),
        this.processDepositPayment(event),
      ]);

      console.log(`Booking ${bookingId} confirmation processing completed`);
    } catch (error) {
      console.error(`Error processing booking confirmation ${bookingId}:`, error);
      
      // Publish compensation event if needed
      // await this.eventBus.publish(new BookingConfirmationFailedEvent(event.bookingId, error.message));
      
      throw error; // Re-throw for retry mechanism
    }
  }

  private async sendNotifications(event: BookingConfirmedEvent): Promise<void> {
    // Send confirmation emails
    const [artistNotification, clientNotification] = await Promise.all([
      this.emailService.sendBookingConfirmationToArtist({
        artistId: event.artistId,
        bookingId: event.bookingId.value,
        clientId: event.clientId,
        scheduledDate: event.scheduledDate,
      }),
      this.emailService.sendBookingConfirmationToClient({
        clientId: event.clientId,
        artistId: event.artistId,
        bookingId: event.bookingId.value,
        scheduledDate: event.scheduledDate,
      }),
    ]);

    // Send push notifications
    await this.notificationService.sendPushNotification({
      userId: event.clientId,
      title: 'Booking Confirmed!',
      message: `Your tattoo appointment has been confirmed for ${event.scheduledDate.toLocaleDateString()}`,
      type: 'booking_confirmed',
      data: { bookingId: event.bookingId.value },
    });
  }

  private async createCalendarEvents(event: BookingConfirmedEvent): Promise<void> {
    // Create calendar events for both artist and client
    const calendarEvent = {
      bookingId: event.bookingId.value,
      title: 'Tattoo Appointment',
      startTime: event.scheduledDate,
      duration: event.estimatedDuration || 120, // minutes
      location: 'Artist Studio', // This should come from artist profile
    };

    await Promise.all([
      this.calendarService.createEvent(event.artistId, calendarEvent),
      this.calendarService.createEvent(event.clientId, calendarEvent),
    ]);
  }

  private async processDepositPayment(event: BookingConfirmedEvent): Promise<void> {
    // Process deposit payment if not already done
    // This might be handled elsewhere, but included for completeness
    try {
      await this.paymentService.captureDeposit(event.bookingId.value);
    } catch (error) {
      console.warn(`Deposit capture failed for booking ${event.bookingId.value}:`, error);
      // Don't fail the entire confirmation process for payment issues
    }
  }
}
```

---

## 3. Infrastructure Implementation

### Repository Implementation

```typescript
// src/infrastructure/repositories/PrismaBookingRepository.ts
import { PrismaClient, Booking as PrismaBooking } from '@prisma/client';
import { IBookingRepository } from '@/domain/repositories/IBookingRepository';
import { BookingSession } from '@/domain/aggregates/BookingSession';
import { BookingSessionId } from '@/domain/value-objects/BookingSessionId';

export class PrismaBookingRepository implements IBookingRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: BookingSessionId): Promise<BookingSession | null> {
    const data = await this.prisma.booking.findUnique({
      where: { id: id.value },
      include: {
        artist: {
          select: { id: true, name: true, email: true },
        },
        client: {
          select: { id: true, name: true, email: true },
        },
        design: {
          select: { id: true, title: true, price: true },
        },
      },
    });

    return data ? this.toDomain(data) : null;
  }

  async save(booking: BookingSession): Promise<void> {
    const data = this.toPersistence(booking);
    
    try {
      await this.prisma.booking.upsert({
        where: { id: booking.id.value },
        create: {
          id: data.id,
          artistId: data.artistId,
          clientId: data.clientId,
          designId: data.designId,
          scheduledDate: data.scheduledDate,
          estimatedDuration: data.estimatedDuration,
          totalPrice: data.totalPrice,
          depositAmount: data.depositAmount,
          status: data.status,
          notes: data.notes,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
        update: {
          scheduledDate: data.scheduledDate,
          estimatedDuration: data.estimatedDuration,
          totalPrice: data.totalPrice,
          status: data.status,
          notes: data.notes,
          updatedAt: data.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error saving booking:', error);
      throw new Error('Failed to save booking');
    }
  }

  async findConflictingBookings(
    artistId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<BookingSession[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        artistId,
        status: {
          in: ['pending', 'confirmed'],
        },
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        AND: [
          {
            scheduledDate: {
              lt: endTime,
            },
          },
          {
            scheduledDate: {
              gte: startTime,
            },
          },
        ],
      },
      include: {
        artist: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    return bookings.map(this.toDomain);
  }

  async isArtistAvailable(
    artistId: string,
    dateTime: Date,
    durationMinutes: number = 120
  ): Promise<boolean> {
    const endTime = new Date(dateTime.getTime() + (durationMinutes * 60 * 1000));
    
    const conflicting = await this.findConflictingBookings(
      artistId,
      dateTime,
      endTime
    );

    return conflicting.length === 0;
  }

  async findUpcomingBookings(
    artistId: string,
    fromDate: Date,
    limit: number = 50
  ): Promise<BookingSession[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        artistId,
        scheduledDate: {
          gte: fromDate,
        },
        status: {
          in: ['confirmed', 'pending'],
        },
      },
      orderBy: { scheduledDate: 'asc' },
      take: limit,
      include: {
        client: { select: { id: true, name: true, email: true } },
        design: { select: { id: true, title: true } },
      },
    });

    return bookings.map(this.toDomain);
  }

  private toDomain(data: any): BookingSession {
    return BookingSession.reconstitute({
      id: BookingSessionId.create(data.id),
      artistId: data.artistId,
      clientId: data.clientId,
      designId: data.designId,
      scheduledDate: data.scheduledDate,
      estimatedDuration: data.estimatedDuration,
      totalPrice: Money.create(data.totalPrice, data.currency || 'USD'),
      depositAmount: Money.create(data.depositAmount, data.currency || 'USD'),
      status: data.status,
      notes: data.notes,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private toPersistence(booking: BookingSession): any {
    return {
      id: booking.id.value,
      artistId: booking.artistId,
      clientId: booking.clientId,
      designId: booking.designId,
      scheduledDate: booking.scheduledDate,
      estimatedDuration: booking.estimatedDuration,
      totalPrice: booking.totalPrice.amount,
      depositAmount: booking.depositAmount.amount,
      currency: booking.totalPrice.currency,
      status: booking.status,
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
```

### Event Bus Implementation

```typescript
// src/infrastructure/events/EventBus.ts
import { IEventBus } from '@/application/interfaces/IEventBus';
import { DomainEvent } from '@/domain/events/DomainEvent';
import { IEventHandler } from '@/application/interfaces/IEventHandler';

export class EventBus implements IEventBus {
  private handlers: Map<string, IEventHandler<any>[]> = new Map();
  private eventStore: DomainEvent[] = []; // For testing/debugging

  public register<T extends DomainEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
  }

  public async publish<T extends DomainEvent>(event: T): Promise<void> {
    // Store event for auditing
    this.eventStore.push(event);

    const eventType = event.constructor.name;
    const handlers = this.handlers.get(eventType) || [];

    if (handlers.length === 0) {
      console.warn(`No handlers registered for event: ${eventType}`);
      return;
    }

    // Execute handlers in parallel
    const promises = handlers.map(handler => 
      this.executeHandler(handler, event).catch(error => {
        console.error(`Error in event handler for ${eventType}:`, error);
        // Don't let one handler failure affect others
        return null;
      })
    );

    await Promise.all(promises);
  }

  private async executeHandler<T extends DomainEvent>(
    handler: IEventHandler<T>,
    event: T
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      await handler.handle(event);
      
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`Slow event handler detected: ${handler.constructor.name} took ${duration}ms`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Event handler failed: ${handler.constructor.name} after ${duration}ms`, error);
      throw error;
    }
  }

  // For testing
  public getPublishedEvents(): DomainEvent[] {
    return [...this.eventStore];
  }

  public clearEvents(): void {
    this.eventStore = [];
  }
}
```

---

## 4. API Layer Patterns

### Next.js API Route with Full Error Handling

```typescript
// app/api/v1/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CreateBookingCommand } from '@/application/commands/CreateBookingCommand';
import { CreateBookingHandler } from '@/application/handlers/CreateBookingHandler';
import { withRateLimit } from '@/lib/middleware/rateLimiting';
import { ApiResponse, ApiError } from '@/types/api';

// Validation schema
const CreateBookingSchema = z.object({
  artistId: z.string().uuid(),
  designId: z.string().uuid().optional(),
  scheduledDate: z.string().datetime(),
  estimatedDuration: z.number().min(30).max(480), // 30 minutes to 8 hours
  notes: z.string().max(1000).optional().default(''),
  paymentMethodId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            path: request.nextUrl.pathname,
          },
        } satisfies ApiError,
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = await withRateLimit('create_booking', 5, 60000)(request);
    if (rateLimitResult) {
      return rateLimitResult; // Rate limit exceeded
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateBookingSchema.parse(body);

    // Create command
    const command = new CreateBookingCommand(
      validatedData.artistId,
      session.user.id,
      validatedData.designId,
      new Date(validatedData.scheduledDate),
      validatedData.estimatedDuration,
      validatedData.notes,
      validatedData.paymentMethodId
    );

    // Execute command
    const handler = new CreateBookingHandler(
      bookingRepository,
      artistRepository,
      paymentService,
      eventBus
    );

    const bookingId = await handler.handle(command);

    // Success response
    const response: ApiResponse<{ bookingId: string }> = {
      data: { bookingId },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { 
      status: 201,
      headers: {
        'Location': `/api/v1/bookings/${bookingId}`,
      },
    });

  } catch (error) {
    return handleApiError(error, request);
  }
}

function handleApiError(error: any, request: NextRequest): NextResponse {
  const timestamp = new Date().toISOString();
  const path = request.nextUrl.pathname;

  // Validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
          timestamp,
          path,
        },
      } satisfies ApiError,
      { status: 400 }
    );
  }

  // Domain errors
  if (error.name === 'DomainError') {
    return NextResponse.json(
      {
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: error.message,
          timestamp,
          path,
        },
      } satisfies ApiError,
      { status: 422 }
    );
  }

  // Not found errors
  if (error.message.includes('not found')) {
    return NextResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          timestamp,
          path,
        },
      } satisfies ApiError,
      { status: 404 }
    );
  }

  // Generic server error
  console.error('API Error:', error);
  
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp,
        path,
      },
    } satisfies ApiError,
    { status: 500 }
  );
}
```

### Advanced Middleware

```typescript
// src/lib/middleware/apiMiddleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export interface MiddlewareContext {
  user?: { id: string; role: string };
  params?: Record<string, string>;
  body?: any;
}

export type ApiHandler = (
  request: NextRequest,
  context: MiddlewareContext
) => Promise<NextResponse>;

export type Middleware = (
  request: NextRequest,
  context: MiddlewareContext,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

// Compose multiple middlewares
export function withMiddleware(...middlewares: Middleware[]) {
  return function (handler: ApiHandler) {
    return async function (request: NextRequest, routeContext?: any): Promise<NextResponse> {
      const context: MiddlewareContext = { params: routeContext?.params };
      
      let index = 0;
      
      async function next(): Promise<NextResponse> {
        if (index >= middlewares.length) {
          return handler(request, context);
        }
        
        const middleware = middlewares[index++];
        return middleware(request, context, next);
      }
      
      return next();
    };
  };
}

// Authentication middleware
export const withAuth: Middleware = async (request, context, next) => {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }
  
  context.user = session.user;
  return next();
};

// Authorization middleware
export function withRole(requiredRole: string): Middleware {
  return async (request, context, next) => {
    if (!context.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    
    if (context.user.role !== requiredRole) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }
    
    return next();
  };
}

// Validation middleware
export function withValidation(schema: z.ZodSchema): Middleware {
  return async (request, context, next) => {
    try {
      if (request.method !== 'GET') {
        const body = await request.json();
        context.body = schema.parse(body);
      }
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors,
            },
          },
          { status: 400 }
        );
      }
      throw error;
    }
  };
}

// Usage example
export const POST = withMiddleware(
  withAuth,
  withRole('artist'),
  withValidation(CreateDesignSchema)
)(async (request, context) => {
  // Handler implementation with guaranteed auth, role, and validation
  const { user, body } = context;
  
  // Business logic here...
  
  return NextResponse.json({ success: true });
});
```

---

## 5. Testing Implementation

### Unit Test Utilities

```typescript
// src/test-utils/TestBuilder.ts
export class ArtistTestBuilder {
  private props: Partial<ArtistProps> = {};

  public withId(id: string): this {
    this.props.id = ArtistId.create(id);
    return this;
  }

  public withEmail(email: string): this {
    this.props.email = Email.create(email);
    return this;
  }

  public withName(name: string): this {
    this.props.name = name;
    return this;
  }

  public verified(): this {
    this.props.isVerified = true;
    return this;
  }

  public withSpecialty(specialty: string): this {
    if (!this.props.specialties) {
      this.props.specialties = [];
    }
    this.props.specialties.push(TattooStyle.create(specialty));
    return this;
  }

  public build(): Artist {
    return Artist.create({
      email: this.props.email || Email.create('test@example.com'),
      name: this.props.name || 'Test Artist',
      bio: 'Test bio',
      specialties: this.props.specialties || [TattooStyle.create('Traditional')],
      portfolioImages: [],
      isVerified: this.props.isVerified || false,
      rating: 4.5,
      location: Address.create('Test Location'),
      ...this.props,
    });
  }

  public buildMany(count: number): Artist[] {
    return Array.from({ length: count }, (_, i) => 
      this.withEmail(`test${i}@example.com`)
          .withName(`Test Artist ${i}`)
          .build()
    );
  }
}

// Usage in tests
const artist = new ArtistTestBuilder()
  .withEmail('john@example.com')
  .withName('John Doe')
  .verified()
  .withSpecialty('Realism')
  .build();
```

### Integration Test Setup

```typescript
// src/test-utils/TestDatabase.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export class TestDatabase {
  private prisma: PrismaClient;
  private databaseUrl: string;

  constructor() {
    // Generate unique database name for this test run
    const testId = Math.random().toString(36).substring(7);
    this.databaseUrl = `postgresql://user:password@localhost:5432/tattoo_test_${testId}`;
    
    this.prisma = new PrismaClient({
      datasources: { db: { url: this.databaseUrl } },
    });
  }

  async setup(): Promise<void> {
    // Create test database
    execSync(`createdb tattoo_test_${this.testId}`, { stdio: 'ignore' });
    
    // Run migrations
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: this.databaseUrl },
      stdio: 'ignore',
    });
    
    // Connect Prisma
    await this.prisma.$connect();
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
    execSync(`dropdb tattoo_test_${this.testId}`, { stdio: 'ignore' });
  }

  async reset(): Promise<void> {
    // Clear all tables while maintaining foreign key constraints
    const tables = [
      'BookingSession',
      'TattooDesign', 
      'PortfolioImage',
      'ArtistSpecialty',
      'Artist',
      'User',
    ];

    await this.prisma.$transaction(
      tables.map(table => 
        this.prisma.$executeRawUnsafe(`DELETE FROM "${table}"`)
      )
    );
  }

  // Factory methods for test data
  async createTestArtist(overrides: Partial<Artist> = {}): Promise<Artist> {
    const artist = new ArtistTestBuilder()
      .withEmail(overrides.email || 'test@example.com')
      .verified()
      .build();

    await this.artistRepository.save(artist);
    return artist;
  }

  async createTestBooking(overrides: Partial<BookingSession> = {}): Promise<BookingSession> {
    const booking = new BookingTestBuilder()
      .withArtistId(overrides.artistId || 'artist-123')
      .withClientId(overrides.clientId || 'client-123')
      .build();

    await this.bookingRepository.save(booking);
    return booking;
  }

  // Repository getters
  get artistRepository() {
    return new PrismaArtistRepository(this.prisma);
  }

  get bookingRepository() {
    return new PrismaBookingRepository(this.prisma);
  }
}
```

### E2E Test Example

```typescript
// tests/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await page.goto('/test-setup');
    await page.evaluate(async () => {
      await window.testUtils.seedDatabase({
        artists: [
          {
            id: 'artist-1',
            name: 'John Doe',
            email: 'john@example.com',
            isVerified: true,
            specialties: ['Traditional', 'Realism'],
          }
        ],
        clients: [
          {
            id: 'client-1',
            name: 'Jane Smith',
            email: 'jane@example.com',
          }
        ]
      });
    });
  });

  test('complete booking flow', async ({ page }) => {
    // Login as client
    await page.goto('/auth/signin');
    await page.fill('[data-testid=email]', 'jane@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=signin-button]');

    // Search for artists
    await page.goto('/artists');
    await page.fill('[data-testid=search-input]', 'Traditional');
    await page.click('[data-testid=search-button]');

    // Select artist
    await page.click('[data-testid=artist-card]:first-child');
    
    // Verify artist profile loads
    await expect(page.locator('h1')).toContainText('John Doe');
    
    // Click book appointment
    await page.click('[data-testid=book-appointment-button]');
    
    // Fill booking form
    await page.selectOption('[data-testid=design-select]', 'custom');
    await page.fill('[data-testid=date-input]', '2024-12-01');
    await page.fill('[data-testid=time-input]', '14:00');
    await page.fill('[data-testid=notes-textarea]', 'Looking for a traditional style piece');
    
    // Submit booking
    await page.click('[data-testid=submit-booking-button]');
    
    // Verify success
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page.locator('[data-testid=booking-id]')).toContainText(/booking-\w+/);
    
    // Verify booking appears in client dashboard
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid=upcoming-bookings]')).toContainText('John Doe');
    
    // Verify booking appears in artist dashboard (need to switch user)
    await page.goto('/auth/signout');
    await page.goto('/auth/signin');
    await page.fill('[data-testid=email]', 'john@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=signin-button]');
    
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid=pending-bookings]')).toContainText('Jane Smith');
  });

  test('handles booking conflicts', async ({ page }) => {
    // Create existing booking
    await page.evaluate(async () => {
      await window.testUtils.createBooking({
        artistId: 'artist-1',
        clientId: 'other-client',
        scheduledDate: '2024-12-01T14:00:00Z',
        status: 'confirmed',
      });
    });

    // Login and try to book same time slot
    await page.goto('/auth/signin');
    await page.fill('[data-testid=email]', 'jane@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=signin-button]');

    await page.goto('/artists/artist-1');
    await page.click('[data-testid=book-appointment-button]');
    
    await page.fill('[data-testid=date-input]', '2024-12-01');
    await page.fill('[data-testid=time-input]', '14:00');
    await page.click('[data-testid=submit-booking-button]');
    
    // Verify error message
    await expect(page.locator('[data-testid=error-message]')).toContainText(
      'Artist is not available at the requested time'
    );
  });
});
```

This comprehensive implementation guide provides practical, production-ready code examples that demonstrate all the architectural patterns and best practices defined in the main document. Each example includes proper error handling, type safety, and follows the established patterns for maintainability and scalability.