import { sendMessage } from "./lib"

/*
 *
 */
export function groupMembersAdded(params, ctx, done) {
  const admin = ctx.getAppAdminContext();
  admin.groupWithID(params.groupID)
    .listTopics()
    .then(args => {
      const topics = args[0];
      return Promise.all(topics.map(t =>
        sendMessage(t, "GROUP-MEMBERS-ADDED", {members: params.members})
      ));
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
