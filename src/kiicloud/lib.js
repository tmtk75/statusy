"strict"

function wrap(def) {
  return new Promise((resolve, reject) => def.then(resolve).fail(reject))
}

export function get(headers, url) {
  return wrap($.ajax({ method: "GET", headers: headers, url: url }))
}

export function groups(headers, url) {
  return get(headers, url)
    .then(res => res.map(e => e.login))
}

function ensureGroup(admin, gname, owner) {
  var n = gname.toLowerCase();
  return admin.groupWithID(n).refresh()
    .then(g => g)
    .catch(err => admin.registerGroupWithOwnerAndID(n /* gid */, n /* name */, owner.getUUID(), []))
}

function belong(group, user) {
  group.addUser(user);
  return group;
}

export function ensureToBelong(admin, groups, user) {
  return Promise.all(groups.map(g => ensureGroup(admin, g, user).then(g => belong(g, user).save())))
}
