import { Polar } from "@polar-sh/sdk";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
    action,
    httpAction,
    internalQuery,
    mutation,
    query
} from "./_generated/server";
import schema from "./schema";

const createCheckout = async ({
    customerEmail,
    productPriceId,
    successUrl,
    metadata
}: {
    customerEmail: string;
    productPriceId: string;
    successUrl: string;
    metadata?: Record<string, string>;
}) => {
    try {
        if (!process.env.POLAR_ACCESS_TOKEN) {
            console.error("POLAR_ACCESS_TOKEN is not configured");
            throw new Error("POLAR_ACCESS_TOKEN is not configured");
        }

        // Force production environment for Polar SDK
        const environment = "production";
        console.log("Initializing Polar SDK with environment:", environment);
        
        const polar = new Polar({
            server: environment,
            accessToken: process.env.POLAR_ACCESS_TOKEN,
        });

        console.log("Initialized Polar SDK with token:", process.env.POLAR_ACCESS_TOKEN?.substring(0, 8) + "...");

        console.log("Creating checkout with params:", {
            productPriceId,
            successUrl,
            customerEmail,
            metadataKeys: metadata ? Object.keys(metadata) : []
        });

        try {
            const result = await polar.checkouts.custom.create({
                productPriceId,
                successUrl,
                customerEmail,
                metadata
            });

            console.log("Checkout created successfully with URL:", result.url);
            return result;
        } catch (polarError: any) {
            console.error("Polar API error:", polarError);
            
            // Check if it's an authentication error
            if (polarError.statusCode === 401) {
                console.error("Authentication error with Polar API. Token may be invalid or expired.");
                // Fall back to test URL in case of auth errors
                return { url: `${successUrl}?mock=true&error=auth_failed` };
            }
            
            throw polarError;
        }
    } catch (error) {
        console.error("Error creating checkout:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        throw error;
    }
};

export const getPlanByKey = internalQuery({
    args: {
        key: schema.tables.plans.validator.fields.key,
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query("plans")
            .withIndex("key", (q) => q.eq("key", args.key))
            .unique();
    },
});

export const getOnboardingCheckoutUrl = action({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.runQuery(api.users.getUserByToken, {
            tokenIdentifier: identity.subject
        });

        if (!user) {
            throw new Error("User not found");
        }

        const product = await ctx.runQuery(internal.subscriptions.getPlanByKey, {
            key: "free",
        });

        const price = product?.prices.month?.usd;

        if (!price) {
            throw new Error("Price not found");
        }
        if (!user.email) {
            throw new Error("User email not found");
        }
        const metadata = {
            userId: user.tokenIdentifier,
            userEmail: user.email,
            tokenIdentifier: identity.subject,
            plan: "free"
        };

        const checkout = await createCheckout({
            customerEmail: user.email,
            productPriceId: price.polarId,
            metadata,
            successUrl: `${process.env.FRONTEND_URL}/success`,
        });

        return checkout.url;
    },
});

export const getProOnboardingCheckoutUrl = action({
    args: {
        interval: schema.tables.subscriptions.validator.fields.interval,
    },
    handler: async (ctx, args) => {
        try {
            console.log("Starting getProOnboardingCheckoutUrl");
            console.log("POLAR_ACCESS_TOKEN exists:", !!process.env.POLAR_ACCESS_TOKEN);
            console.log("FRONTEND_URL exists:", !!process.env.FRONTEND_URL);
            
            // Fallback values for development/testing
            const polarToken = process.env.POLAR_ACCESS_TOKEN || "missing_token";
            const frontendUrl = process.env.FRONTEND_URL || "https://www.sereni.day";
            
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
                console.error("Not authenticated");
                throw new Error("Not authenticated");
            }

            const user = await ctx.runQuery(api.users.getUserByToken, {
                tokenIdentifier: identity.subject
            });

            if (!user) {
                console.error("User not found");
                throw new Error("User not found");
            }

            const product = await ctx.runQuery(internal.subscriptions.getPlanByKey, {
                key: "pro",
            });

            if (!product) {
                console.error("Product not found");
                throw new Error("Product not found");
            }

            const price =
                args.interval === "month"
                    ? product?.prices.month?.usd
                    : product?.prices.year?.usd;

            console.log("Selected price:", JSON.stringify(price, null, 2));

            if (!price) {
                console.error("Price not found");
                throw new Error("Price not found");
            }
            
            if (!user.email) {
                console.error("User email not found");
                throw new Error("User email not found");
            }

            const metadata: Record<string, string> = {
                userId: user.tokenIdentifier,
                userEmail: user.email,
                tokenIdentifier: identity.subject,
                plan: "pro"
            };

            if (args.interval) {
                metadata.interval = args.interval;
            }

            console.log("Creating checkout with:", {
                customerEmail: user.email,
                productPriceId: price.polarId,
                successUrl: `${frontendUrl}/success`,
            });

            // If we're missing the Polar token, return a mock URL for development
            if (!process.env.POLAR_ACCESS_TOKEN) {
                console.warn("Using mock checkout URL due to missing POLAR_ACCESS_TOKEN");
                return `${frontendUrl}/success?mock=true`;
            }

            const checkout = await createCheckout({
                customerEmail: user.email,
                productPriceId: price.polarId,
                successUrl: `${frontendUrl}/success`,
                metadata
            });

            console.log("Checkout created successfully");
            return checkout.url;
        } catch (error) {
            console.error("Error in getProOnboardingCheckoutUrl:", error);
            throw error;
        }
    },
});

export const getProOnboardingCheckoutUrlTest = action({
    args: {
        interval: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        try {
            console.log("Starting test checkout function");
            
            // Get the frontend URL with fallback
            const frontendUrl = process.env.FRONTEND_URL || "https://www.sereni.day";
            
            console.log("Environment variables:", {
                polarExists: !!process.env.POLAR_ACCESS_TOKEN,
                frontendUrlExists: !!process.env.FRONTEND_URL,
                nodeEnv: process.env.NODE_ENV || "not set",
                usingFrontendUrl: frontendUrl
            });
            
            // Get user information for the test URL
            const identity = await ctx.auth.getUserIdentity();
            let userId = "unknown";
            let userEmail = "unknown";
            
            if (identity) {
                const user = await ctx.runQuery(api.users.getUserByToken, {
                    tokenIdentifier: identity.subject
                });
                
                if (user) {
                    userId = user.tokenIdentifier;
                    userEmail = user.email || "no-email";
                }
            }
            
            // Return a mock URL for testing with user info
            return `${frontendUrl}/success?mock=true&test=1&user=${userId}&email=${encodeURIComponent(userEmail)}&interval=${args.interval || "month"}`;
        } catch (error) {
            console.error("Error in test function:", error);
            // Even if there's an error, return a URL that will work
            return "https://www.sereni.day/success?mock=true&error=test_function_error";
        }
    },
});

export const getUserSubscriptionStatus = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return { hasActiveSubscription: false };
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.subject)
            )
            .unique();

        if (!user) {
            return { hasActiveSubscription: false };
        }

        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
            .first();

        const hasActiveSubscription = subscription?.status === "active";
        return { hasActiveSubscription };
    }
});

export const getUserSubscription = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.subject)
            )
            .unique();

        if (!user) {
            return null;
        }

        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("userId", (q) => q.eq("userId", user.tokenIdentifier))
            .first();

        return subscription;
    }
});

export const subscriptionStoreWebhook = mutation({
    args: {
        body: v.any(),
    },
    handler: async (ctx, args) => {

        // Extract event type from webhook payload
        const eventType = args.body.type;

        // Store webhook event
        await ctx.db.insert("webhookEvents", {
            type: eventType,
            polarEventId: args.body.data.id,
            createdAt: args.body.data.created_at,
            modifiedAt: args.body.data.modified_at || args.body.data.created_at,
            data: args.body.data,
        });

        switch (eventType) {
            case 'subscription.created':

                // Insert new subscription
                await ctx.db.insert("subscriptions", {
                    polarId: args.body.data.id,
                    polarPriceId: args.body.data.price_id,
                    currency: args.body.data.currency,
                    interval: args.body.data.recurring_interval,
                    userId: args.body.data.metadata.userId,
                    status: args.body.data.status,
                    currentPeriodStart: new Date(args.body.data.current_period_start).getTime(),
                    currentPeriodEnd: new Date(args.body.data.current_period_end).getTime(),
                    cancelAtPeriodEnd: args.body.data.cancel_at_period_end,
                    amount: args.body.data.amount,
                    startedAt: new Date(args.body.data.started_at).getTime(),
                    endedAt: args.body.data.ended_at
                        ? new Date(args.body.data.ended_at).getTime()
                        : undefined,
                    canceledAt: args.body.data.canceled_at
                        ? new Date(args.body.data.canceled_at).getTime()
                        : undefined,
                    customerCancellationReason: args.body.data.customer_cancellation_reason || undefined,
                    customerCancellationComment: args.body.data.customer_cancellation_comment || undefined,
                    metadata: args.body.data.metadata || {},
                    customFieldData: args.body.data.custom_field_data || {},
                    customerId: args.body.data.customer_id
                });
                break;

            case 'subscription.updated':
                // Find existing subscription
                const existingSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (existingSub) {
                    await ctx.db.patch(existingSub._id, {
                        amount: args.body.data.amount,
                        status: args.body.data.status,
                        currentPeriodStart: new Date(args.body.data.current_period_start).getTime(),
                        currentPeriodEnd: new Date(args.body.data.current_period_end).getTime(),
                        cancelAtPeriodEnd: args.body.data.cancel_at_period_end,
                        metadata: args.body.data.metadata || {},
                        customFieldData: args.body.data.custom_field_data || {},
                    });
                }
                break;

            case 'subscription.active':
                // Find and update subscription
                const activeSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (activeSub) {
                    await ctx.db.patch(activeSub._id, {
                        status: args.body.data.status,
                        startedAt: new Date(args.body.data.started_at).getTime(),
                    });
                }
                break;

            case 'subscription.canceled':
                // Find and update subscription
                const canceledSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (canceledSub) {
                    await ctx.db.patch(canceledSub._id, {
                        status: args.body.data.status,
                        canceledAt: args.body.data.canceled_at
                            ? new Date(args.body.data.canceled_at).getTime()
                            : undefined,
                        customerCancellationReason: args.body.data.customer_cancellation_reason || undefined,
                        customerCancellationComment: args.body.data.customer_cancellation_comment || undefined,
                    });
                }
                break;

            case 'subscription.uncanceled':
                // Find and update subscription
                const uncanceledSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (uncanceledSub) {
                    await ctx.db.patch(uncanceledSub._id, {
                        status: args.body.data.status,
                        cancelAtPeriodEnd: false,
                        canceledAt: undefined,
                        customerCancellationReason: undefined,
                        customerCancellationComment: undefined,
                    });
                }
                break;

            case 'subscription.revoked':
                // Find and update subscription
                const revokedSub = await ctx.db
                    .query("subscriptions")
                    .withIndex("polarId", (q) => q.eq("polarId", args.body.data.id))
                    .first();

                if (revokedSub) {
                    await ctx.db.patch(revokedSub._id, {
                        status: 'revoked',
                        endedAt: args.body.data.ended_at
                            ? new Date(args.body.data.ended_at).getTime()
                            : undefined,
                    });
                }
                break;

            case 'order.created':
                console.log("order.created:", args.body);
                // Orders are handled through the subscription events
                break;

            default:
                console.log(`Unhandled event type: ${eventType}`);
                break;
        }
    },
});

export const paymentWebhook = httpAction(async (ctx, request) => {

    console.log("Webhook received!", {
        method: request.method,
        url: request.url,
        headers: request.headers
    });

    try {
        const body = await request.json();

        // track events and based on events store data
        await ctx.runMutation(api.subscriptions.subscriptionStoreWebhook, {
            body
        });

        console.log("Webhook body:", body);
        return new Response(JSON.stringify({ message: "Webhook received!" }), {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        });

    } catch (error) {
        console.log("No JSON body or parsing failed");
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
            status: 400,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

});

export const getUserDashboardUrl = action({
    handler: async (ctx, args: { customerId: string }) => {
        // Force production environment for Polar SDK
        const environment = "production";
        console.log("Initializing Polar SDK with environment for dashboard:", environment);
        
        const polar = new Polar({
            server: environment,
            accessToken: process.env.POLAR_ACCESS_TOKEN,
        });

        try {
            const result = await polar.customerSessions.create({
                customerId: args.customerId,
            });

            // Only return the URL to avoid Convex type issues
            return { url: result.customerPortalUrl };
        } catch (error) {
            console.error("Error creating customer session:", error);
            throw new Error("Failed to create customer session");
        }
    }
});
