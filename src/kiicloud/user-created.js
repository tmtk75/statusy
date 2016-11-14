/*
 *
 */
export function userCreated(params, ctx, done) {
  const admin = ctx.getAppAdminContext();
  admin.userWithID(params.userID).refresh()
    .then(user => {
      const e = admin.bucketWithName("waiting-list")
        .createObjectWithID(params.userID);
      e.set("id", params.userID);
      e.set("loginName", user.getUsername());
      return e.save()
    })
    .then(_ => done())
    .catch(err => {
      console.error(err.message);
      done();
    })
}
