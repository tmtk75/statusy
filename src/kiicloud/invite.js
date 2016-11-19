import { sendMessage } from "./lib"

/*
 *
 */
export function invite(params, ctx, done) {
  if (!ctx.getAccessToken()) {
    const emsg = "not logged in: " + JSON.stringify(params);
    console.warn(emsg);
    return done({error: emsg});
  }
  //TODO: ensure the current user belongs to the group.
  const admin = ctx.getAppAdminContext();
  admin.findUserByUsername(params.invitee)
    .then(args => {
      const user = args[1];
      const g = admin.groupWithID(params.groupName);
      g.addUser(user);

      const topic   = user.topicWithName("notify");
      const payload = {inviter: ctx.userID, group: params.groupName};
      const m = sendMessage(topic, "INVITED", payload);

      return Promise.all([g.save(), m]);
    })
    .then(_ => done(params))
    .catch(err => done({error: err.message}));
}
