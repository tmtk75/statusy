/*
 *
 */
export function invite(params, ctx, done) {
  if (!ctx.getAccessToken()) {
    return done({error: "not logged in"});
  }
  const admin = ctx.getAppAdminContext();
  admin.findUserByUsername(params.invitee)
    .then(args => {
      const user = args[1];
      const g = admin.groupWithID(params.groupName);
      g.addUser(user);
      return g.save();
    })
    .then(_ => done(_))
    .catch(err => done({error: err.message}));
}
