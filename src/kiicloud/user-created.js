/*
 *
 */
export function userCreated(params, ctx, done) {
  const admin = ctx.getAppAdminContext();
  admin.userWithID(params.userID).refresh()
    .then(user => subscribe(admin, user, "broadcast"))
    .then(_ => done())
    .catch(err => {
      console.error(err.message);
      done();
    })
}

function subscribe(admin, user, name) {
  return admin.listTopics()
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
}
