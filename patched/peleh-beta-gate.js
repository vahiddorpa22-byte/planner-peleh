/* ===================== پله — دروازه‌ی بتا (batch 2026-11-03، باز شده در batch 2026-11-08) =====================
   ۱۲ آبان ۱۴۰۵: همه‌ی تغییرهای batch 2026-11-03 فقط برای حساب وحید روشن بود.
   ۱۷ آبان ۱۴۰۵ (تصمیم وحید): «باید برای همه کاربرها نشون داده بشه» ← PELEH_BETA_ALL = true.
   یعنی برای همه: لَم و «کتاب لَم»، ورزش لَم، آنبوردینگ (اولین تیک)، کارت «امروز فقط یه پله»، یادآوری ۲۱:۳۰ و
   وضعیت نوتیف، نمایش تصویری حرکت‌ها، BMI خنثی، متن بلند کارها، ویرایش حرکت اختصاصی مربی (coach-beta.js).

   برگردوندن به حالت فقط‌وحید (اضطراری) = همین یه خط: PELEH_BETA_ALL = false
   (سمت سرور جداست: تابع send-fixed-reminders، که مشاور ارشد مستقیم به‌روز می‌کنه) */
var PELEH_BETA_ALL = true;
// لَم جدا هم قابل خاموش/روشن‌شدنه (وقتی PELEH_BETA_ALL خاموشه، این تعیین می‌کنه لَم برای همه باشه یا نه)
var PELEH_LAM_ALL = true;
var PELEH_BETA_USERS = ["295bf792-5f7e-495c-b933-4bdd6739d9ab"]; // vahid.dorpa22@gmail.com — ابزارهای آزمایشی (پیش‌نمایش آنبوردینگ)
function pelehBetaUser(userId){
  return PELEH_BETA_ALL === true || (!!userId && PELEH_BETA_USERS.indexOf(String(userId)) >= 0);
}
// فقط حساب‌های تستر (مستقل از PELEH_BETA_ALL) — برای دکمه‌های آزمایشی
function pelehBetaTester(userId){ return !!userId && PELEH_BETA_USERS.indexOf(String(userId)) >= 0; }
