-- پله‌بات v5 — بحث و نظرسنجی کتابی خودکار در گروه «گفت‌وگوی پله» (۱۸ آبان ۱۴۰۵)
-- ۱) نوع‌های جدید tg_schedule: discussion، poll، poll_result
-- ۲) برنامه تا یلدا: سه‌شنبه‌ها ۲۰:۰۰ «گپ سه‌شنبه» (سؤال + نظرسنجی ۲۰:۰۱)، جمعه‌ها ۱۲:۰۰ نتیجه در کانال و گروه؛
--    پنجشنبه/شنبه/دوشنبه ۱۳:۰۰ یه سؤال سبک کتابی. همه‌ی زمان‌ها به وقت تهران.
-- اجرا فقط با تأیید وحید. بازگشت: پایین فایل.

alter table public.tg_schedule drop constraint if exists tg_schedule_kind_check;
alter table public.tg_schedule add constraint tg_schedule_kind_check
  check (kind = any (array['checkin','post','summary','discussion','poll','poll_result']::text[]));

-- ───── گپ سه‌شنبه (۶ بحث) ─────
insert into public.tg_schedule (target, kind, send_at, text, dedupe_key) values
('group','discussion', timestamptz '2026-11-10 20:00 Asia/Tehran',
 E'☕ گپ سه‌شنبه · بحث ۱\n\nکتابی که از صفحه‌ی ۵۰ خوشت نیومده:\nتا آخر می‌خونیش یا ولش می‌کنی؟ 📖\n\nنظرسنجی پایینه؛ زیر همین پیام یه جمله بنویس چرا.', 'v5:debate:1'),
('group','poll', timestamptz '2026-11-10 20:01 Asia/Tehran',
 E'کتابی که از صفحه‌ی ۵۰ خوشت نیومده رو…\n- تا آخر می‌خونم؛ شروع کردم، تمومش می‌کنم\n- ول می‌کنم؛ عمر کوتاهه\n- یه فرصت دیگه، تا صفحه‌ی ۱۰۰', 'v5:debate:1:poll'),

('group','discussion', timestamptz '2026-11-17 20:00 Asia/Tehran',
 E'☕ گپ سه‌شنبه · بحث ۲\n\nکتاب صوتی گوش دادن، «کتاب خوندن» حساب می‌شه؟ 🎧\n\nنظرسنجی پایینه؛ زیر همین پیام بگو: خودت کتاب صوتی گوش می‌دی؟ کدوم؟', 'v5:debate:2'),
('group','poll', timestamptz '2026-11-17 20:01 Asia/Tehran',
 E'کتاب صوتی = کتاب خوندن؟\n- آره، فرقی نداره\n- نه، خوندن یعنی چشم و کاغذ\n- بستگی داره به کتاب', 'v5:debate:2:poll'),

('group','discussion', timestamptz '2026-11-24 20:00 Asia/Tehran',
 E'☕ گپ سه‌شنبه · بحث ۳\n\nاول کتاب، بعد فیلم؟ یا برعکس؟ 🎬\n\nنظرسنجی پایینه؛ زیر همین پیام بگو کدوم فیلم از کتابش بهتر بود؟', 'v5:debate:3'),
('group','poll', timestamptz '2026-11-24 20:01 Asia/Tehran',
 E'کتاب و فیلمش: کدوم اول؟\n- اول کتاب، همیشه\n- اول فیلم، بعد کتاب\n- فقط یکی‌شون کافیه', 'v5:debate:3:poll'),

('group','discussion', timestamptz '2026-12-01 20:00 Asia/Tehran',
 E'☕ گپ سه‌شنبه · بحث ۴\n\nیه کتاب معروف که به نظرت بیش از حد تعریفش رو کردن؟ 🤔\nفقط اسمش و یه جمله؛ با احترام به کسایی که دوستش دارن 🌿', 'v5:debate:4'),
('group','poll', timestamptz '2026-12-01 20:01 Asia/Tehran',
 E'کتاب‌های خیلی معروف…\n- من زیاد از این کتاب‌ها دارم\n- نه، معمولاً حق با بقیه‌ست\n- نصف‌نصف', 'v5:debate:4:poll'),

('group','discussion', timestamptz '2026-12-08 20:00 Asia/Tehran',
 E'☕ گپ سه‌شنبه · بحث ۵\n\nخط کشیدن زیر جمله، تا کردن گوشه‌ی صفحه، نوشتن تو حاشیه:\nعشق به کتابه یا جرم؟ ✍️\n\nزیر همین پیام بگو تو کدوم دسته‌ای.', 'v5:debate:5'),
('group','poll', timestamptz '2026-12-08 20:01 Asia/Tehran',
 E'علامت گذاشتن تو کتاب…\n- عشق؛ کتاب باید زندگی کنه\n- جرم؛ کتاب باید تمیز بمونه\n- فقط با مداد', 'v5:debate:5:poll'),

('group','discussion', timestamptz '2026-12-15 20:00 Asia/Tehran',
 E'☕ گپ سه‌شنبه · بحث ۶ (نزدیک یلدا 🍉)\n\nشب یلدا یه کتاب هدیه می‌دی. به کی، و چه کتابی؟ 📚\nپیشنهادهاتون جمعه می‌شه «فهرست هدیه‌ی یلدای گروه پله».', 'v5:debate:6'),
('group','poll', timestamptz '2026-12-15 20:01 Asia/Tehran',
 E'کتاب هدیه دادن…\n- هدیه دادم\n- امسال می‌دم\n- کتاب هدیه نمی‌دم', 'v5:debate:6:poll');

-- نتیجه‌ها: جمعه‌ها ۱۲:۰۰ (کانال + گروه). ref = id ردیف poll همون هفته.
insert into public.tg_schedule (target, kind, send_at, text, dedupe_key)
select 'channel', 'poll_result', r.at, 'ref=' || p.id || E'\n' || r.title, 'v5:debate:' || r.n || ':result'
from (values
  (1, timestamptz '2026-11-13 12:00 Asia/Tehran', 'نظر گروه پله: کتاب بد رو تا آخر بخونیم؟ 📊'),
  (2, timestamptz '2026-11-20 12:00 Asia/Tehran', 'نظر گروه پله: کتاب صوتی هم کتاب خوندنه؟ 📊'),
  (3, timestamptz '2026-11-27 12:00 Asia/Tehran', 'نظر گروه پله: اول کتاب یا اول فیلم؟ 📊'),
  (4, timestamptz '2026-12-04 12:00 Asia/Tehran', 'نظر گروه پله: کتاب‌های بیش از حد معروف 📊'),
  (5, timestamptz '2026-12-11 12:00 Asia/Tehran', 'نظر گروه پله: علامت گذاشتن تو کتاب، عشق یا جرم؟ 📊'),
  (6, timestamptz '2026-12-18 12:00 Asia/Tehran', 'نظر گروه پله: کتاب هدیه‌ی یلدا 📊')
) as r(n, at, title)
join public.tg_schedule p on p.dedupe_key = 'v5:debate:' || r.n || ':poll';

-- ───── سؤال‌های سبک کتابی (۱۳:۰۰) ─────
insert into public.tg_schedule (target, kind, send_at, text, dedupe_key)
select 'group', 'discussion', q.at, q.txt || E'\n\n👇 جوابت رو زیر همین پیام بنویس.', 'v5:q:' || q.n
from (values
  (1,  timestamptz '2026-11-12 13:00 Asia/Tehran', '📚 اولین کتابی که یادته خودت انتخاب کردی و خوندی چی بود؟'),
  (2,  timestamptz '2026-11-14 13:00 Asia/Tehran', '📖 الان چه کتابی دستته؟ اسمش + یه کلمه که حالش رو بگه.'),
  (3,  timestamptz '2026-11-16 13:00 Asia/Tehran', '✍️ یه جمله از یه کتاب که هنوز تو ذهنت مونده؟ فقط جمله و اسم کتاب.'),
  (4,  timestamptz '2026-11-19 13:00 Asia/Tehran', '🌱 کتابی که به‌خاطرش یه عادت تو زندگیت عوض شد؟'),
  (5,  timestamptz '2026-11-21 13:00 Asia/Tehran', '☕ کجا بهتر کتاب می‌خونی؟ تخت، مبل، مترو، کافه… یا جای عجیب‌تر؟'),
  (6,  timestamptz '2026-11-23 13:00 Asia/Tehran', '⏱️ یه کتاب کوتاه (زیر ۲۰۰ صفحه) پیشنهاد بده که آدم یه‌نفس تمومش کنه. برای چالش آذر عالیه.'),
  (7,  timestamptz '2026-11-26 13:00 Asia/Tehran', '🍽️ یه شخصیت داستانی که دلت می‌خواد یه شب باهاش شام بخوری؟'),
  (8,  timestamptz '2026-11-28 13:00 Asia/Tehran', '🔁 کتابی که چند بار خوندی و باز هم می‌خونی؟'),
  (9,  timestamptz '2026-11-30 13:00 Asia/Tehran', '🔎 موقع انتخاب کتاب اول چی رو نگاه می‌کنی: جلد، اسم نویسنده، پشت جلد یا پیشنهاد دوست؟'),
  (10, timestamptz '2026-12-03 13:00 Asia/Tehran', '🧗 کتابی که شروعش سخت بود ولی بعد عاشقش شدی؟'),
  (11, timestamptz '2026-12-05 13:00 Asia/Tehran', '🎁 یه کتاب که دوست داری همه‌ی دوستات بخونن. فقط یکی 🙂'),
  (12, timestamptz '2026-12-07 13:00 Asia/Tehran', '🌙 شب‌ها قبل خواب می‌خونی یا صبح‌ها؟ کدوم برات بهتر جواب داده؟'),
  (13, timestamptz '2026-12-10 13:00 Asia/Tehran', '🌍 بهترین ترجمه‌ای که خوندی؟ اسم کتاب و مترجم.'),
  (14, timestamptz '2026-12-12 13:00 Asia/Tehran', '💡 یه کتاب غیرداستانی که نگاهت رو به یه چیزی عوض کرد؟'),
  (15, timestamptz '2026-12-14 13:00 Asia/Tehran', '🏝️ اگه فقط یه کتاب می‌تونستی با خودت به یه جزیره ببری، کدوم؟'),
  (16, timestamptz '2026-12-17 13:00 Asia/Tehran', '🤐 کتابی که آخرش رو دوست نداشتی؟ (بدون لو دادن آخرش!)'),
  (17, timestamptz '2026-12-19 13:00 Asia/Tehran', '📊 این ماه تقریباً چند صفحه خوندی؟ نزدیک‌ترین عدد رو بگو؛ قضاوتی در کار نیست 🌿'),
  (18, timestamptz '2026-12-21 13:00 Asia/Tehran', '🍉 امشب شب یلداست. کدوم کتاب رو کنار انار و آجیل باز می‌کنی؟')
) as q(n, at, txt);

-- --------------------------------------------------------------------------------------------
-- بازگشت (ROLLBACK):
--   delete from public.tg_schedule where dedupe_key like 'v5:%' and sent_at is null;
--   (اگه بات به v4 برگشت: نوع‌های جدید رو هم از constraint بردار — بعد از پاک کردن ردیف‌هاشون)
--   delete from public.tg_schedule where kind in ('discussion','poll','poll_result');
--   alter table public.tg_schedule drop constraint tg_schedule_kind_check;
--   alter table public.tg_schedule add constraint tg_schedule_kind_check check (kind = any (array['checkin','post','summary']::text[]));
-- --------------------------------------------------------------------------------------------
