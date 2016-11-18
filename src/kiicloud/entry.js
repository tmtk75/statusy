"strict"
import { config } from "./config";
import { userCreated } from "./user-created";
import { groupMembersAdded } from "./group-members-added";
import { invite } from "./invite";

(function(exports) {
  exports.join = config;
  exports.userCreated = userCreated;
  exports.groupMembersAdded = groupMembersAdded;
  exports.invite = invite;
})(global);
