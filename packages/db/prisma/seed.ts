import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash test passwords
  const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
  const hashedPasswordStaff = await bcrypt.hash('staff123', 10);
  const hashedPasswordCustomer1 = await bcrypt.hash('joy123', 10);
  const hashedPasswordCustomer2 = await bcrypt.hash('sarah123', 10);

  // Clear existing data
  await prisma.feedLog.deleteMany({});
  await prisma.healthEvent.deleteMany({});
  await prisma.vaccination.deleteMany({});
  await prisma.vaccinationSchedule.deleteMany({});
  await prisma.eggProduction.deleteMany({});
  await prisma.growthLog.deleteMany({});
  await prisma.mortalityLog.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.feedStock.deleteMany({});
  await prisma.feedType.deleteMany({});
  await prisma.humidityLog.deleteMany({});
  await prisma.temperatureLog.deleteMany({});
  await prisma.incubationBatch.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.promo.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.user.deleteMany({});

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@ecokuku.local',
      phone: '254712345678',
      password: hashedPasswordAdmin,
      role: 'ADMIN',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: 'Farm Staff',
      email: 'staff@ecokuku.local',
      phone: '254712345679',
      password: hashedPasswordStaff,
      role: 'STAFF',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      name: 'Joy Kwamboka',
      email: 'joy@example.com',
      phone: '254712345680',
      password: hashedPasswordCustomer1,
      role: 'CUSTOMER',
      referralCode: 'JOY2024',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: 'Sarah Kipchoge',
      email: 'sarah@example.com',
      phone: '254712345681',
      password: hashedPasswordCustomer2,
      role: 'CUSTOMER',
      referralCode: 'SARAH2024',
    },
  });

  // Create addresses
  await prisma.address.create({
    data: {
      userId: customer1.id,
      area: 'Nairobi Central',
      street: '123 Main Street',
      landmark: 'Near Nairobi Hospital',
      isDefault: true,
    },
  });

  // Create feed types
  const starterFeed = await prisma.feedType.create({
    data: {
      name: 'Starter Feed',
      supplier: 'Kenya Feeds Ltd',
      cost: 45,
    },
  });

  const layerMash = await prisma.feedType.create({
    data: {
      name: 'Layer Mash',
      supplier: 'Farmers Choice',
      cost: 35,
    },
  });

  const broilerFeed = await prisma.feedType.create({
    data: {
      name: 'Broiler Finisher',
      supplier: 'Kenya Feeds Ltd',
      cost: 40,
    },
  });

  // Create feed stock
  await prisma.feedStock.create({
    data: {
      feedTypeId: starterFeed.id,
      quantity: 500,
      unit: 'kg',
    },
  });

  await prisma.feedStock.create({
    data: {
      feedTypeId: layerMash.id,
      quantity: 800,
      unit: 'kg',
    },
  });

  // Create products
  const eggsTray = await prisma.product.create({
    data: {
      sku: 'EGGS-TRAY-30',
      name: 'Farm Fresh Eggs - Tray (30)',
      description: "30 fresh eggs from our free-range hens. Delivered same-day in Nairobi.",
      type: 'EGGS_TRAY',
      category: 'EGGS',
      price: 650,
      wholesalePrice: 500,
      available: true,
      stock: 100,
      image: '/products/eggs-tray.jpg',
    },
  });

  const eggsCrate = await prisma.product.create({
    data: {
      sku: 'EGGS-CRATE-360',
      name: 'Farm Fresh Eggs - Crate (360)',
      description: '360 eggs - wholesale crate for restaurants and shops.',
      type: 'EGGS_CRATE',
      category: 'EGGS',
      price: 6800,
      wholesalePrice: 5500,
      available: true,
      stock: 20,
    },
  });

  const chickenLive = await prisma.product.create({
    data: {
      sku: 'CHICKEN-LIVE',
      name: 'Live Broiler Chicken (2kg avg)',
      description: 'Healthy live broiler chicken, ready for slaughter.',
      type: 'CHICKEN_LIVE',
      category: 'LIVE_POULTRY',
      price: 850,
      wholesalePrice: 700,
      available: true,
      stock: 50,
    },
  });

  const chickenDressed = await prisma.product.create({
    data: {
      sku: 'CHICKEN-DRESSED',
      name: 'Dressed Chicken (1.8kg avg)',
      description: 'Professional butchered, ready-to-cook chicken.',
      type: 'CHICKEN_DRESSED',
      category: 'DRESSED_MEAT',
      price: 1200,
      available: true,
      stock: 30,
    },
  });

  const chicks = await prisma.product.create({
    data: {
      sku: 'CHICKS-BROILER-100',
      name: 'Day-Old Broiler Chicks (100)',
      description: 'Healthy broiler chicks from certified hatchery.',
      type: 'CHICK',
      category: 'CHICKS',
      price: 1500,
      wholesalePrice: 1200,
      available: true,
      stock: 500,
    },
  });

  // Create promos
  const promo1 = await prisma.promo.create({
    data: {
      code: 'FRESH15',
      description: '15% off first order',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      maxUses: 1000,
      maxPerUser: 1,
      active: true,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
    },
  });

  const promo2 = await prisma.promo.create({
    data: {
      code: 'BULK50',
      description: 'KSh 50 off orders over KSh 5000',
      discountType: 'FIXED',
      discountValue: 50,
      maxUses: 500,
      active: true,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
    },
  });

  // Create batches
  const batch1 = await prisma.batch.create({
    data: {
      batchNumber: 'LAYER-2024-001',
      type: 'LAYER',
      status: 'ACTIVE',
      startDate: new Date('2023-08-15'),
      expectedReady: new Date('2024-04-15'),
      quantity: 5000,
      currentCount: 4850,
      breed: 'Lohmann Brown',
      source: 'National Hatchery',
    },
  });

  const batch2 = await prisma.batch.create({
    data: {
      batchNumber: 'BROILER-2024-021',
      type: 'BROILER',
      status: 'ACTIVE',
      startDate: new Date('2024-02-01'),
      expectedReady: new Date('2024-04-15'),
      quantity: 3000,
      currentCount: 2950,
      breed: 'Ross 308',
      source: 'ABC Hatchery',
    },
  });

  // Create incubation batch
  const incubation = await prisma.incubationBatch.create({
    data: {
      batchNumber: 'INCUB-2024-005',
      eggCount: 5000,
      startDate: new Date('2024-02-20'),
      expectedHatchDate: new Date('2024-03-22'),
      hatchedCount: 0,
    },
  });

  // Create temperature and humidity logs
  for (let i = 0; i < 7; i++) {
    await prisma.temperatureLog.create({
      data: {
        incubationBatchId: incubation.id,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        temperature: 37.5 + (Math.random() * 0.3 - 0.15),
      },
    });

    await prisma.humidityLog.create({
      data: {
        incubationBatchId: incubation.id,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        humidity: 55 + (Math.random() * 10 - 5),
      },
    });
  }

  // Create drivers
  const driver1 = await prisma.driver.create({
    data: {
      name: 'Peter Kariuki',
      phone: '254712345690',
      vehicle: 'Toyota Van',
      plate: 'KCB 123X',
      active: true,
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      name: 'Moses Kipchoge',
      phone: '254712345691',
      vehicle: 'Isuzu Truck',
      plate: 'KBV 456Y',
      active: true,
    },
  });

  // Create orders
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ECO-2024-00001',
      customerId: customer1.id,
      orderType: 'RETAIL',
      status: 'DELIVERED',
      subtotal: 1300,
      deliveryFee: 200,
      discountAmount: 15,
      total: 1485,
      paymentRef: 'STK123456',
      deliveryArea: 'Nairobi Central',
      deliveryDate: new Date(),
      paymentMethod: 'MPESA',
      driverId: driver1.id,
      items: {
        create: [
          {
            productId: eggsTray.id,
            quantity: 1,
            price: 650,
            subtotal: 650,
          },
          {
            productId: chickenLive.id,
            quantity: 1,
            price: 650,
            subtotal: 650,
          },
        ],
      },
    },
  });

  // Create egg production logs
  for (let i = 0; i < 7; i++) {
    await prisma.eggProduction.create({
      data: {
        batchId: batch1.id,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        collected: 3700 + Math.floor(Math.random() * 150),
        broken: Math.floor(Math.random() * 20),
        cracked: Math.floor(Math.random() * 15),
      },
    });
  }

  // Create mortality logs
  await prisma.mortalityLog.create({
    data: {
      batchId: batch1.id,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      count: 5,
      cause: 'Natural mortality',
    },
  });

  // Create vaccination schedule
  const vaccinations = [
    { type: 'NEWCASTLE', daysOld: 4 },
    { type: 'GUMBORO', daysOld: 7 },
    { type: 'NEWCASTLE', daysOld: 14 },
    { type: 'FOWLPOX', daysOld: 21 },
  ];

  for (const vacc of vaccinations) {
    await prisma.vaccinationSchedule.create({
      data: {
        type: vacc.type as any,
        daysOld: vacc.daysOld,
      },
    });
  }

  // Create feed logs
  await prisma.feedLog.create({
    data: {
      batchId: batch1.id,
      feedType: 'Layer Mash',
      recordedDate: new Date(),
      quantityUsed: 250,
      supplier: 'Local Supply Co',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📝 Test Account Credentials:');
  console.log('  Admin:');
  console.log('    📧 Email:', adminUser.email);
  console.log('    🔑 Password: admin123');
  console.log('');
  console.log('  Staff:');
  console.log('    📧 Email:', staffUser.email);
  console.log('    🔑 Password: staff123');
  console.log('');
  console.log('  Customer 1:');
  console.log('    📧 Email:', customer1.email);
  console.log('    🔑 Password: joy123');
  console.log('');
  console.log('  Customer 2:');
  console.log('    📧 Email:', customer2.email);
  console.log('    🔑 Password: sarah123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
