/*
 *
 */
export function groupMembersAdded(params, ctx, done) {
  const admin = ctx.getAppAdminContext();
  admin.groupWithID(params.groupID)
    .listTopics()
    .then(args => {
      const topics = args[0];
      return Promise.all(topics.map(t => {
        const m = {type: "GROUP-MEMBERS-ADDED", payload: {members: params.members}};
        const data = {value: JSON.stringify(m)};
        const msg = new KiiPushMessageBuilder(data).build()
        return t.sendMessage(msg)
      }));
    })
    .then(_ => done(_))
    .catch(err => {
      done(err.message);
    })
}
/*
{
  "groupID": "kiicorp",
  "members": [
    "3c794b2c5ea0-5f19-6e11-01da-094966ec"
  ],
  "failed": [],
  "uri": "kiicloud://groups/kiicorp"
}
*/
