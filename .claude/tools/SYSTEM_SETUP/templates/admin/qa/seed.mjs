/**
 * Fills a LOCAL WAB-Server (fake OTP provider, MinIO storage) with realistic data through its public APIs:
 * 3 customers, 2 approved and complete salons (owner + staff, services, hours, policy, pictures), bookings,
 * reviews. Usage: node qa/seed.mjs (see docs/REAL_SERVER_QA.md). Never run it against a shared server.
 */
import { adminToken, api, installation, log, proof, putTo, PNG, PDF, resetLog } from './lib.mjs';

resetLog();
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const admin = await adminToken();
const areas = (
  await api('admin', 'GET', '/locations/areas', undefined, admin, '?page=1&pageSize=5')
).data;
const cityId = areas[0].cityId;
const areaId = areas[0].id;

const customers = [
  ['Dana', 'Khoury', '790000001', 'FEMALE'],
  ['Omar', 'Saleh', '790000002', 'MALE'],
  ['Rima', 'Haddad', '790000003', 'FEMALE'],
];
for (const [first, last, n, gender] of customers) {
  await api('customer', 'POST', '/auth/register', {
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase()}@example.test`,
    gender,
    cityId,
    areaId,
    phone: { countryCode: 'JO', number: n },
    otpToken: await proof('customer', `+962${n}`, 'REGISTER'),
    installation: installation(`qa-install-${n}-device`),
  });
}

const merchants = [
  ['791000001', 'Maha', 'Haddad', 'Noor Salon', 'FEMALE', ['Sara', 'Ali', '791100001']],
  ['791000002', 'Khaled', 'Nasser', 'Royal Barber', 'MALE', ['Yazan', 'Omar', '791100002']],
];
for (const [n, first, last, salonName, gender] of merchants) {
  const pres = await api('merchant', 'POST', '/uploads/license/presign', {
    contentType: 'application/pdf',
    size: PDF.length,
  });
  await putTo(pres.data.upload, PDF);
  await api('merchant', 'POST', '/uploads/license/confirm', { key: pres.data.key });
  await api('merchant', 'POST', '/salon/applications', {
    phone: { countryCode: 'JO', number: n },
    otpToken: await proof('merchant', `+962${n}`, 'REGISTER'),
    firstName: first,
    lastName: last,
    salon: { name: salonName, gender, cityId, areaId },
    documentKeys: [pres.data.key],
    installation: installation(`qa-merchant-${n}-dev`),
  });
}
const pending = (
  await api(
    'admin',
    'GET',
    '/salons/applications',
    undefined,
    admin,
    '?page=1&pageSize=10&state=APPLICATION_PENDING',
  )
).data;
for (const a of pending)
  await api(
    'admin',
    'POST',
    `/salons/applications/${a.id}/approve`,
    { reason: 'QA approve' },
    admin,
  );

const salonIds = {};
for (const [n, , , salonName, gender, extra] of merchants) {
  const login = await api('merchant', 'POST', '/auth/login', {
    phone: { countryCode: 'JO', number: n },
    otpToken: await proof('merchant', `+962${n}`, 'LOGIN'),
    installation: installation(`qa-merchant-${n}-dev`),
  });
  const token = login.data.accessToken;
  const upload = async (purpose) => {
    const p = await api(
      'merchant',
      'POST',
      '/uploads/presign',
      { purpose, contentType: 'image/png', size: PNG.length },
      token,
    );
    await putTo(p.data.upload, PNG);
    await api('merchant', 'POST', '/uploads/confirm', { key: p.data.key }, token);
    return p.data.key;
  };
  const cover = await upload('SALON_COVER');
  const logo = await upload('SALON_PROFILE');
  await api(
    'merchant',
    'PATCH',
    '/salon/profile',
    {
      description: 'Hair, nails and bridal packages in Amman',
      coverKey: cover,
      profileKey: logo,
      location: { latitude: 31.95, longitude: 35.91 },
      locationText: 'Abdoun, Amman',
      phone: `+962${n}`,
      whatsapp: `+962${n}`,
    },
    token,
  );
  for (let i = 0; i < 2; i++)
    await api(
      'merchant',
      'POST',
      '/salon/gallery',
      { type: 'IMAGE', key: await upload('GALLERY_IMAGE') },
      token,
    );
  await api(
    'merchant',
    'PUT',
    '/salon/hours/weekly',
    { days: DAYS.map((d) => ({ day: d, isOff: d === 'FRI', open: '09:00', close: '21:00' })) },
    token,
  );
  await api(
    'merchant',
    'PUT',
    '/salon/policy',
    {
      cancellationWindowHours: 24,
      paymentOptions: ['PAY_ON_ARRIVAL', 'DEPOSIT'],
      depositPercentage: 30,
      depositRefundableOnCustomerCancel: false,
      fullPaymentRefundOnCustomerCancel: 'FULL',
      noShowDeposit: 'KEEP',
      noShowFullPayment: 'KEEP',
    },
    token,
  );
  const catalog = await api(
    'merchant',
    'GET',
    '/catalog/services',
    undefined,
    token,
    `?page=1&pageSize=5&gender=${gender}`,
  );
  const serviceIds = [];
  for (const c of catalog.data.slice(0, 3))
    serviceIds.push(
      (
        await api(
          'merchant',
          'POST',
          '/salon/services',
          { catalogServiceId: c.id, price: '15.000', durationMinutes: 45 },
          token,
        )
      ).data.id,
    );
  const staff = {
    providesServices: true,
    bio: 'Senior stylist',
    yearsOfExperience: 6,
    serviceIds,
    brideQualified: gender === 'FEMALE',
    workingDays: DAYS.filter((d) => d !== 'FRI').map((d) => ({
      day: d,
      start: '09:00',
      end: '21:00',
    })),
  };
  const owner = (await api('merchant', 'GET', '/team/members', undefined, token)).data[0];
  await api('merchant', 'PUT', `/team/members/${owner.id}/staff`, staff, token);
  const member = await api(
    'merchant',
    'POST',
    '/team/members',
    {
      firstName: extra[0],
      lastName: extra[1],
      phone: { countryCode: 'JO', number: extra[2] },
      role: 'EMPLOYEE',
    },
    token,
  );
  await api('merchant', 'PUT', `/team/members/${member.data.id}/staff`, staff, token);
  const salon = (await api('merchant', 'GET', '/salon', undefined, token)).data;
  salonIds[salonName] = salon.id;
  log('salon', salonName, salon.state, JSON.stringify(salon.completeness));
}

const customerToken = async (n) =>
  (
    await api('customer', 'POST', '/auth/login', {
      phone: { countryCode: 'JO', number: n },
      otpToken: await proof('customer', `+962${n}`, 'LOGIN'),
      installation: installation(`qa-install-${n}-device`),
    })
  ).data.accessToken;
const book = async (token, n, salonId, plusDays, serviceIdx, name) => {
  const detail = (await api('customer', 'GET', `/salons/${salonId}`, undefined, token)).data;
  const serviceIds = [detail.services[serviceIdx].id];
  const day = new Date();
  day.setDate(day.getDate() + plusDays);
  const date = day.toISOString().slice(0, 10);
  const availability = await api(
    'customer',
    'POST',
    `/salons/${salonId}/availability`,
    { date, person: { serviceIds } },
    token,
  );
  const slot = availability.data.slots.find((s) => s.available);
  if (!slot) return;
  const draft = await api(
    'customer',
    'POST',
    '/bookings/drafts',
    {
      salonId,
      paymentMethod: 'PAY_ON_ARRIVAL',
      persons: [{ name, serviceIds, start: slot.start }],
    },
    token,
  );
  await api(
    'customer',
    'POST',
    `/bookings/drafts/${draft.data.id}/verify-otp`,
    { otpToken: await proof('customer', `+962${n}`, 'BOOKING_CONFIRMATION') },
    token,
  );
  const booking = await api('customer', 'POST', '/bookings', { draftId: draft.data.id }, token);
  log('booking', booking.data?.referenceNumber, booking.data?.status);
};
const dana = await customerToken('790000001');
const omar = await customerToken('790000002');
await book(dana, '790000001', salonIds['Noor Salon'], 2, 0, 'Dana');
await book(dana, '790000001', salonIds['Noor Salon'], 3, 1, 'Dana');
await book(omar, '790000002', salonIds['Royal Barber'], 2, 0, 'Omar');
await api(
  'customer',
  'POST',
  `/salons/${salonIds['Noor Salon']}/reviews`,
  { rating: 5, comment: 'Lovely service' },
  dana,
);
await api(
  'customer',
  'POST',
  `/salons/${salonIds['Royal Barber']}/reviews`,
  { rating: 2, comment: 'Waited too long' },
  omar,
);
console.log('SEED-DONE', JSON.stringify(salonIds));
