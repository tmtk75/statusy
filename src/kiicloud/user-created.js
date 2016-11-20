import { sendMessage } from "./lib"

/*
 *
 */
export function userCreated(params, ctx, done) {
  const admin = ctx.getAppAdminContext();
  admin.userWithID(params.userID).refresh()
    .then(user => subscribe(admin, user, "broadcast"))
    .then(args => {
      const user  = args[0];
      const topic = args[1];
      return sendMessage(topic, "USER-SIGNED-IN", {user: user.getUsername()})
    })
    .then(_ => done())
    .catch(err => {
      console.error(err.message);
      done();
    })
}

function subscribe(admin, user, name) {
  const p = admin.listTopics()
    .then(args => {
      const topics = args[0]
      var t;
      topics.forEach(e => {  // Array.find is not supported by babel es2016
        if (e.getName() === name)
          t = e;
      });
      if (t) {
        return t;
      }
      return admin.topicWithName(name).save();
    })
    .then(topic => user.pushSubscription().isSubscribed(topic))
    .then(args => {
      const psub  = args[0];
      const topic = args[1];
      const b     = args[2];
      return b ? Promise.resolve([psub, topic]) : psub.subscribe(topic)
    })

  const t = user.topicWithName("notify").save()
    .then(topic => user.pushSubscription().subscribe(topic));

  return Promise.all([user, p, t]);
}
