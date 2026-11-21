/* ===================== پله — دروازه‌ی بتا (batch 2026-11-03) =====================
   تصمیم وحید (۱۲ آبان ۱۴۰۵): همه‌ی تغییرهای این دسته فقط برای حساب‌های این لیست روشن‌ان.
   برای بقیه هیچ فایل live عوض نشده (app.js، coach-plus.js، peleh-app.css دست‌نخورده‌ان) و
   فایل‌های بتا خودشون اول isBeta() رو چک می‌کنن و برای بقیه هیچ کاری نمی‌کنن.

   باز کردن برای همه = فقط همین یه خط:  PELEH_BETA_ALL = true
   (لیست سمت سرور جداست: BETA_USER_IDS در تابع send-fixed-reminders) */
var PELEH_BETA_ALL = false;
var PELEH_BETA_USERS = ["295bf792-5f7e-495c-b933-4bdd6739d9ab"]; // vahid.dorpa22@gmail.com
function pelehBetaUser(userId){
  return PELEH_BETA_ALL === true || (!!userId && PELEH_BETA_USERS.indexOf(String(userId)) >= 0);
}
