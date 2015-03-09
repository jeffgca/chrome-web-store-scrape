window.onNavigate = function() {
  var s = document.querySelector('.webstore-Qf-P');
  var category = s.querySelector('span.webstore-O-P-Oe-Hb .webstore-O-P-i').textContent;
  var strUsers = s.querySelector('span.webstore-O-P-Oe-Hb .webstore-O-P-if').textContent;
  var strUpdated = s.querySelector('.webstore-qb-Vb-nd-bc-C-rh-sh').textContent;
  var id = document.location.href.split('/').pop();

  return {
    category: category,
    strUsers: strUsers,
    strUpdated: strUpdated,
    id: id
  };
}

onNavigate();