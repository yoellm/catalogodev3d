(function () {
  let promise;
  window.CATALOGO_BOOT = Object.freeze({
    loadFirebase() {
      if (!promise) promise = Promise.all([
        import('https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js'),
        import('https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js')
      ]);
      return promise;
    }
  });
})();
