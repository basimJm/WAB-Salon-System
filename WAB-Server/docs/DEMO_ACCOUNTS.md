# Demo accounts (development data only)

Loaded by `npm run seed:demo` or, on the hosted dev service, by `SEED_DEMO_ON_START=true` (+ `SEED_DEMO_DATABASE`; see `docs/DEPLOYMENT.md` → Demo data). Never on production.

**All numbers are invented test numbers.** Jordan has no reserved fictional mobile range and the API accepts only `7[789]xxxxxxx`, so the demo uses fixed blocks that look nothing like a person's number: `+962 78900 0xxx` (salon staff), `+962 78901 0xxx` (branch staff), `+962 79900 0xxx` (customers). Do not reuse them outside dev.

**Signing in (merchant app):** enter the number, request the code, then:
- hosted dev with an ARQAM **TEST** key: the code goes to the key's own test phone, whatever number was entered;
- local stack: `OTP_PROVIDER=fake` + `OTP_FIXED_CODE` (the fixed code works for every number).

Roles: the **owner** sees every branch and has every permission; a **branch manager** has every non-owner permission inside their branch (answers booking requests); an **employee** has `BOOKINGS_VIEW_OWN` + `REVIEWS_VIEW` only (their own appointments and reviews). "main" = the salon's main branch (created by the branch migration from the salon's own address).

## Women's salons

| Salon | Branch | Role | Name | Phone | Bride-qualified |
|---|---|---|---|---|---|
| Lamar Beauty Lounge | all branches | OWNER | Rana Haddad | +962789000001 | — |
| Lamar Beauty Lounge | Abdoun (main) | MANAGER | Lina Hijazi | +962789000002 | yes |
| Lamar Beauty Lounge | Abdoun (main) | EMPLOYEE | Dana Majali | +962789000003 | yes |
| Lamar Beauty Lounge | Abdoun (main) | EMPLOYEE | Hala Saleh | +962789000004 | no |
| Lamar Beauty Lounge | Abdoun (main) | EMPLOYEE | Sara Shami | +962789000005 | no |
| Lamar Beauty Lounge | Khalda | MANAGER | Noor Saleh | +962789010001 | yes |
| Lamar Beauty Lounge | Khalda | EMPLOYEE | Reem Odeh | +962789010002 | no |
| Lamar Beauty Lounge | Dabouq | MANAGER | Aya Abbadi | +962789010003 | yes |
| Lamar Beauty Lounge | Dabouq | EMPLOYEE | Farah Smadi | +962789010004 | no |
| Lamar Beauty Lounge | Gardens | MANAGER | Jana Saleh | +962789010007 | yes |
| Lamar Beauty Lounge | Gardens | EMPLOYEE | Yara Odeh | +962789010008 | no |
| Lamar Beauty Lounge | Gardens | EMPLOYEE | Mais Abbadi | +962789010009 | no |
| Rose Bridal Studio | all branches | OWNER | Maya Obeidat | +962789000006 | — |
| Rose Bridal Studio | Sweifieh (main) | MANAGER | Noor Odeh | +962789000007 | yes |
| Rose Bridal Studio | Sweifieh (main) | EMPLOYEE | Reem Rawashdeh | +962789000008 | yes |
| Rose Bridal Studio | Sweifieh (main) | EMPLOYEE | Aya Nasser | +962789000009 | no |
| Rose Bridal Studio | Sweifieh (main) | EMPLOYEE | Farah Abbadi | +962789000010 | no |
| Rose Bridal Studio | Al-Rabyeh | MANAGER | Haya Smadi | +962789010010 | yes |
| Rose Bridal Studio | Al-Rabyeh | EMPLOYEE | Ruba Fayez | +962789010011 | no |
| Rose Bridal Studio | Al-Rabyeh | EMPLOYEE | Shahd Haddad | +962789010012 | no |
| Rose Bridal Studio | Jabal Amman | MANAGER | Nada Saleh | +962789010013 | yes |
| Rose Bridal Studio | Jabal Amman | EMPLOYEE | Dima Odeh | +962789010014 | no |
| Rose Bridal Studio | Jabal Amman | EMPLOYEE | Rasha Abbadi | +962789010015 | no |

## Men's salons

| Salon | Branch | Role | Name | Phone |
|---|---|---|---|---|
| Al-Ostaz Barber Shop | all branches | OWNER | Anas Zoubi | +962789000015 |
| Al-Ostaz Barber Shop | Shmeisani (main) | MANAGER | Basel Fayez | +962789000016 |
| Al-Ostaz Barber Shop | Shmeisani (main) | EMPLOYEE | Hasan Masri | +962789000017 |
| Al-Ostaz Barber Shop | Shmeisani (main) | EMPLOYEE | Kareem Tamimi | +962789000018 |
| Al-Ostaz Barber Shop | Shmeisani (main) | EMPLOYEE | Mahmoud Haddad | +962789000019 |
| Al-Ostaz Barber Shop | Shmeisani (2nd branch, SRV-148) | MANAGER | Qais Fayez | +962789010005 |
| Al-Ostaz Barber Shop | Shmeisani (2nd branch, SRV-148) | EMPLOYEE | Tareq Haddad | +962789010006 |
| Al-Ostaz Barber Shop | Tabarbour | MANAGER | Sami Smadi | +962789010016 |
| Al-Ostaz Barber Shop | Tabarbour | EMPLOYEE | Wael Fayez | +962789010017 |
| Al-Ostaz Barber Shop | Tabarbour | EMPLOYEE | Yousef Haddad | +962789010018 |
| Gentlemen's Corner | all branches | OWNER | Nasser Hijazi | +962789000020 |
| Gentlemen's Corner | Dabouq (main) | MANAGER | Rami Majali | +962789000021 |
| Gentlemen's Corner | Dabouq (main) | EMPLOYEE | Sami Saleh | +962789000022 |
| Gentlemen's Corner | Dabouq (main) | EMPLOYEE | Wael Shami | +962789000023 |
| Gentlemen's Corner | Sweifieh | MANAGER | Omar Saleh | +962789010019 |
| Gentlemen's Corner | Sweifieh | EMPLOYEE | Khaled Odeh | +962789010020 |
| Gentlemen's Corner | Sweifieh | EMPLOYEE | Ahmad Abbadi | +962789010021 |
| Gentlemen's Corner | Um Uthaina | MANAGER | Yazan Smadi | +962789010022 |
| Gentlemen's Corner | Um Uthaina | EMPLOYEE | Fadi Fayez | +962789010023 |
| Gentlemen's Corner | Um Uthaina | EMPLOYEE | Saif Haddad | +962789010024 |

## What each extra branch has

Its own address and map point in its Amman area, weekly hours (one day off), phone, the salon's services at its own prices, staff with skills and working days, one closure day and one staff leave (both after the booked period), about 45–55 bookings from 4 weeks ago to 10 days ahead (at least one per open day, so today or tomorrow always has appointments when the seed runs) in every status — PENDING, APPROVED, COMPLETED, NO_SHOW, REJECTED, CANCELLED_BY_CUSTOMER / SALON, AUTO_CANCELLED — with companions and brides (women's branches), their online payments, refunds and ledger lines, 15–30 reviews (approved, pending and rejected; salon and staff), and the notifications the owner, the branch manager and the customers would have received. Ratings and customer counts are recomputed from the stored reviews and bookings after each run.

Other salons (`joury`, `classic` live; `nour` offline; `fade` incomplete; `bella` pending; `sharp` rejected) keep one (main) branch; their staff use `+96278900xxxx` numbers in seed order. Customers: 12 women and 12 men, `+962799000001` … `+962799000024` (a few are blocked or pending deletion on purpose).

Names and numbers are stable: the seed is deterministic, and new demo branches are only ever appended. The dates move with the day the seed first ran.
