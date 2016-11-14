"strict"
import { config } from "./config";
import { userCreated } from "./user-created";

(function(exports) {
  exports.join = config;
  exports.userCreated = userCreated;
})(global);
