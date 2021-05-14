// Pull in additional scripts we need for production
(function(scope, parent_name) {
  const scripts = ['https://unpkg.com/react@17/umd/react.production.min.js',
                   'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js'];

  for (one_script of scripts) {
    const cur_id = one_script.split('/').pop().replaceAll('.', '_');
    if (!scope.getElementById(cur_id)) {
      let el = scope.createElement('script');
      if (!el) continue;

      el.id = cur_id;
      el.type = 'text/javascript';
      el.async =  false;
      el.src = one_script;
      scope.getElementsByTagName(parent_name)[0].appendChild(el);
    }
  }
})(document, 'head')
