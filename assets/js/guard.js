/*
 * رواد — حارس الصفحات (يُحمَّل في <head> قبل رسم الصفحة لمنع وميض المحتوى)
 * data-auth="required" على <html>: صفحات التطبيق — تتطلب تسجيل الدخول.
 * data-auth="guest"    على <html>: صفحات الدخول — تُحوِّل المسجَّل إلى الرئيسية.
 *
 * ملاحظة: هذا حارس واجهة فقط. الحماية الحقيقية يجب أن تكون في الخادم.
 */
(function () {
  var mode = document.documentElement.getAttribute('data-auth');
  if (!mode) return;
  var signedIn = false;
  try {
    var state = JSON.parse(localStorage.getItem('rowad:v1') || '{}');
    signedIn = !!(state && state.signedIn && state.account);
  } catch (e) { /* تخزين غير متاح: نعامل الزائر كضيف */ }

  if (mode === 'required' && !signedIn) {
    var page = location.pathname.split('/').pop() || 'home.html';
    location.replace('login.html?next=' + encodeURIComponent(page + location.search));
  } else if (mode === 'guest' && signedIn) {
    location.replace('home.html');
  }
})();
