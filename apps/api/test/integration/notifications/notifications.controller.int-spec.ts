import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../../../src/app.module';
import { PrismaService } from '../../../../src/prisma/prisma.service';

describe('NotificationsController (integration, ownership)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userACookie: string;
  let userBCookie: string;
  let userANotificationId: string;
  let userBNotificationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaService);

    // Clean relevant tables
    await prisma.notification.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.user.deleteMany({});

    // Seed two users
    const passwordHash = await bcrypt.hash('Passw0rd!', 10);
    const userA = await prisma.user.create({
      data: { email: 'user.a@example.com', name: 'User A', passwordHash },
    });
    const userB = await prisma.user.create({
      data: { email: 'user.b@example.com', name: 'User B', passwordHash },
    });

    // Create notifications for each user
    const nA = await prisma.notification.create({
      data: {
        userEmail: userA.email,
        title: 'For A',
        message: 'Only A should see this',
      },
    });
    const nB = await prisma.notification.create({
      data: {
        userEmail: userB.email,
        title: 'For B',
        message: 'Only B should see this',
      },
    });
    userANotificationId = nA.id;
    userBNotificationId = nB.id;

    // Login both users via real auth flow to get cookies
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ fullName: 'User A', email: userA.email, password: 'Passw0rd!' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ fullName: 'User B', email: userB.email, password: 'Passw0rd!' })
      .expect(201);

    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userA.email, password: 'Passw0rd!' })
      .expect(200);

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userB.email, password: 'Passw0rd!' })
      .expect(200);

    userACookie = (loginA.headers['set-cookie'] as string[]).find((c) =>
      c.startsWith('user_access_token='),
    ) as string;
    userBCookie = (loginB.headers['set-cookie'] as string[]).find((c) =>
      c.startsWith('user_access_token='),
    ) as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows a user to get their own notification by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/notifications/${userANotificationId}`)
      .set('Cookie', userACookie)
      .expect(200);

    expect(res.body.id).toBe(userANotificationId);
    expect(res.body.userEmail).toBe('user.a@example.com');
  });

  it('prevents user A from reading user B notification', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/notifications/${userBNotificationId}`)
      .set('Cookie', userACookie)
      .expect(404);
  });

  it('prevents user A from marking user B notification as read', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${userBNotificationId}/read`)
      .set('Cookie', userACookie)
      .expect(404);
  });

  it('prevents user A from deleting user B notification', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/notifications/${userBNotificationId}`)
      .set('Cookie', userACookie)
      .expect(404);
  });
}

