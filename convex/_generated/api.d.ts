/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as chat from "../chat.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as plans from "../plans.js";
import type * as subscriptions from "../subscriptions.js";
import type * as summary from "../summary.js";
import type * as temp_updatePlanTemp from "../temp/updatePlanTemp.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  feedback: typeof feedback;
  http: typeof http;
  plans: typeof plans;
  subscriptions: typeof subscriptions;
  summary: typeof summary;
  "temp/updatePlanTemp": typeof temp_updatePlanTemp;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
