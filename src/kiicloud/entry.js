"strict"
import { config } from "./config";
import { userCreated } from "./user-created";
import { groupMembersAdded } from "./group-members-added";

(function(exports) {
  exports.join = config;
  exports.userCreated = userCreated;
  exports.groupMembersAdded = groupMembersAdded;
})(global);
