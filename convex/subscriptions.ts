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
import schema, { intervalValidator } from "./schema";
import { MutationCtx } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";

export const createCheckout = action({
    args: {
        customerEmail: v.string(),
        productPriceId: v.string(),
        successUrl: v.string(),
        metadata: v.optional(v.record(v.string(), v.string()))
    },
    handler: async (ctx, args) => {
        const { customerEmail, productPriceId, successUrl, metadata } = args;
        
        try {
            // Determine environment based on NODE_ENV
            const environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
                
            console.log("Initializing Polar SDK with environment:", environment);
            console.log("Current NODE_ENV:", process.env.NODE_ENV);
            
            // Select the appropriate token based on environment
            const accessToken = environment === "production" 
                ? process.env.POLAR_PRODUCTION_ACCESS_TOKEN 
                : process.env.POLAR_SANDBOX_ACCESS_TOKEN;
                
            if (!accessToken) {
                console.error(`${environment === "production" ? "POLAR_PRODUCTION_ACCESS_TOKEN" : "POLAR_SANDBOX_ACCESS_TOKEN"} is not configured`);
                console.error("Available POLAR environment variables:", Object.keys(process.env).filter(key => key.includes("POLAR")));
                
                // In production, throw an error instead of returning a mock URL
                if (environment === "production") {
                    throw new Error("Payment provider configuration error. Please contact support.");
                }
                
                // Only return mock URL in development
                return { url: `${successUrl}?mock=true&error=missing_token&env=${environment}` };
            }
            
            const polar = new Polar({
                server: environment as "production" | "sandbox",
                accessToken: accessToken,
            });

            console.log(`Initialized Polar SDK with ${environment} token:`, accessToken.substring(0, 8) + "...");
            console.log(`Using server parameter:`, environment);
            console.log(`Using success URL: ${successUrl}`);

            console.log("Creating checkout with params:", {
                productPriceId,
                successUrl,
                customerEmail,
                metadataKeys: metadata ? Object.keys(metadata) : []
            });

            try {
                const result = await polar.checkouts.create({
                    productPriceId: productPriceId,
                    successUrl: successUrl,
                    customerEmail: customerEmail,
                    metadata: metadata
                });

                console.log("Checkout created successfully with URL:", result.url);
                return result;
            } catch (polarError: any) {
                console.error("Polar API error:", polarError);
                
                // Check if it's an authentication error
                if (polarError.statusCode === 401) {
                    console.error("Authentication error with Polar API. Token may be invalid or expired.");
                    // In production, throw the error instead of returning a mock URL
                    if (environment === "production") {
                        throw new Error("Authentication error with payment provider. Please contact support.");
                    }
                    // Only fall back to test URL in development
                    return { url: `${successUrl}?mock=true&error=auth_failed&env=${environment}` };
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
    }
});

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
    args: {
        customerEmail: v.string(),
        productPriceId: v.string(),
        successUrl: v.string(),
        metadata: v.optional(v.record(v.string(), v.string()))
    },
    handler: async (ctx, args): Promise<string> => {
        const { customerEmail, productPriceId, successUrl, metadata } = args;
        
        // Extract plan key from productPriceId (e.g., "price_basic_monthly" -> "basic")
        const planKeyMatch = productPriceId.match(/price_([a-z]+)_/);
        const planKey = planKeyMatch ? planKeyMatch[1] : null;
        
        if (!planKey) {
            throw new Error(`Invalid product price ID: ${productPriceId}`);
        }
        
        // Determine environment based on the success URL
        const isProduction = successUrl.includes('www.sereni.day') || successUrl.includes('sereni.day');
        const environment = isProduction ? "production" : "sandbox";
        
        console.log(`Creating checkout for plan ${planKey} in ${environment} environment`);
        console.log(`Success URL: ${successUrl}`);
        
        // Get the plan from the database
        const plan: any = await ctx.runQuery(internal.subscriptions.getPlanByKey, { key: planKey });
        
        if (!plan) {
            throw new Error(`Plan with key ${planKey} not found in database`);
        }
        
        console.log(`Found plan in database:`, plan);
        
        // Get the appropriate access token
        const accessToken = environment === "production"
            ? process.env.POLAR_PRODUCTION_ACCESS_TOKEN
            : process.env.POLAR_SANDBOX_ACCESS_TOKEN;
            
        if (!accessToken) {
            console.error(`Polar ${environment} access token is not configured.`);
            
            if (isProduction) {
                throw new Error(`Payment provider configuration error: ${environment} access token is missing. Please contact support.`);
            }
            
            console.warn("Using mock checkout URL due to missing access token");
            return `${successUrl}?mock=true&error=missing_token&env=${environment}`;
        }
        
        try {
            // Get the correct Polar price ID from the plan
            const priceId: string | undefined = plan.prices?.month?.usd?.polarId;
            
            if (!priceId) {
                throw new Error(`No price ID found for plan ${planKey}`);
            }
            
            console.log(`Using price ID from database: ${priceId}`);
            
            // Create checkout session with direct API call
            const apiUrl = environment === "production" 
                ? "https://api.polar.sh/v1/checkouts" 
                : "https://api.sandbox.polar.sh/v1/checkouts";
            
            // Use the product_price_id directly as required by the API
            const requestBody: {
                success_url: string;
                customer_email: string;
                metadata: Record<string, string>;
                product_price_id: string;
            } = {
                success_url: successUrl,
                customer_email: customerEmail,
                metadata: metadata || {},
                product_price_id: priceId
            };
            
            console.log(`Making API request to ${apiUrl} with body:`, JSON.stringify(requestBody));
            
            const response: Response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error(`${environment} Polar API error:`, errorData);
                
                if (response.status === 401) {
                    throw new Error(`Authentication error with payment provider. Please contact support.`);
                }
                
                throw new Error(`API error: ${response.status} ${JSON.stringify(errorData)}`);
            }
            
            const data: { url?: string } = await response.json();
            console.log(`Checkout created successfully:`, data);
            
            if (!data.url) {
                throw new Error("No checkout URL returned from payment provider");
            }
            
            return data.url;
        } catch (error) {
            console.error(`${environment} Polar API error:`, error);
            
            if (isProduction) {
                throw new Error("Unable to process checkout. Please try again later or contact support.");
            }
            
            // In development, return a mock URL with error details
            return `${successUrl}?mock=true&error=${encodeURIComponent(String(error))}&env=${environment}`;
        }
    },
});

export const getProOnboardingCheckoutUrlTest = action({
    args: {
        interval: v.optional(intervalValidator),
        planKey: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        try {
            console.log("Starting test checkout function");
            
            // Determine the appropriate frontend URL
            // For development, prefer FRONTEND_URL_DEV (ngrok) if available
            const frontendUrl = process.env.NODE_ENV === "production" 
                ? (process.env.FRONTEND_URL || "https://www.sereni.day")
                : (process.env.FRONTEND_URL_DEV || process.env.FRONTEND_URL || "http://localhost:3000");
            
            console.log("Using frontend URL for test function:", frontendUrl);
            
            console.log("Environment variables:", {
                polarExists: !!process.env.POLAR_ACCESS_TOKEN,
                frontendUrlExists: !!process.env.FRONTEND_URL,
                frontendUrlDevExists: !!process.env.FRONTEND_URL_DEV,
                nodeEnv: process.env.NODE_ENV || "not set",
                usingFrontendUrl: frontendUrl
            });
            
            // Get user information for the test URL
            const identity = await ctx.auth.getUserIdentity();
            let userId = "unknown";
            let userEmail = "unknown";
            let planKey = args.planKey || "premium";
            
            if (identity) {
                const user = await ctx.runQuery(api.users.getUserByToken, {
                    tokenIdentifier: identity.subject
                });
                
                if (user) {
                    userId = user.tokenIdentifier;
                    userEmail = user.email || "no-email";
                }
            }
            
            // Return a mock URL that mimics the Polar sandbox URL structure
            // This ensures the client-side validation passes
            const successUrl = `${frontendUrl}/success?mock=true&test=1&user=${userId}&email=${encodeURIComponent(userEmail)}&interval=${args.interval || "month"}&plan=${planKey}`;
            
            return `https://sandbox.polar.sh/api/v1/checkouts/create?price_id=test_price_id&success_url=${encodeURIComponent(successUrl)}&customer_email=${encodeURIComponent(userEmail)}&mock=true`;
        } catch (error) {
            console.error("Error in test function:", error);
            // Even if there's an error, return a URL that will work
            return "https://sandbox.polar.sh/api/v1/checkouts/create?price_id=test_price_id&success_url=https%3A%2F%2Fwww.sereni.day%2Fsuccess%3Fmock%3Dtrue&customer_email=test%40example.com&mock=true";
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
                
                // Update user's plan based on subscription metadata
                if (args.body.data.metadata && args.body.data.metadata.plan && args.body.data.metadata.userId) {
                    await updateUserPlan(ctx, args.body.data.metadata.userId, args.body.data.metadata.plan);
                }
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
                    });
                    
                    // Update user's plan when subscription becomes active
                    if (args.body.data.metadata && args.body.data.metadata.plan && args.body.data.metadata.userId) {
                        await updateUserPlan(ctx, args.body.data.metadata.userId, args.body.data.metadata.plan);
                    }
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

// Helper function to update a user's plan and minutes
async function updateUserPlan(
  ctx: MutationCtx,
  userId: string,
  planKey: string
) {
    console.log(`Updating user ${userId} to plan ${planKey}`);
    
    // Find the user
    const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", userId))
        .unique();
    
    if (!user) {
        console.error(`User ${userId} not found when updating plan`);
        return;
    }
    
    // Get the plan details
    const plan = await ctx.db
        .query("plans")
        .withIndex("key", (q: any) => q.eq("key", planKey))
        .unique();
    
    if (!plan) {
        console.error(`Plan ${planKey} not found when updating user`);
        return;
    }
    
    // Calculate renewal date (1 month from now)
    const now = new Date();
    const renewalDate = new Date(now.setMonth(now.getMonth() + 1)).getTime();
    
    // Update the user with the new plan details
    await ctx.db.patch(user._id, {
        currentPlanKey: planKey,
        minutesRemaining: plan.totalMinutes || 0,
        totalMinutesAllowed: plan.totalMinutes || 0,
        planRenewalDate: renewalDate
    });
    
    console.log(`Successfully updated user ${userId} to plan ${planKey} with ${plan.totalMinutes} minutes`);
}

export const paymentWebhook = httpAction(async (ctx, request) => {
    // Determine environment based on NODE_ENV
    const environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
    
    console.log("Webhook received!", {
        method: request.method,
        url: request.url,
        headers: request.headers,
        environment: environment
    });

    try {
        const body = await request.json();

        // Select the appropriate webhook secret based on environment
        const webhookSecret = environment === "production" 
            ? process.env.POLAR_PRODUCTION_WEBHOOK_SECRET 
            : process.env.POLAR_SANDBOX_WEBHOOK_SECRET || process.env.POLAR_WEBHOOK_SECRET; // Try fallback
            
        if (!webhookSecret) {
            console.error(`${environment === "production" ? "POLAR_PRODUCTION_WEBHOOK_SECRET" : "POLAR_SANDBOX_WEBHOOK_SECRET"} is not configured`);
            console.error("Available POLAR environment variables:", Object.keys(process.env).filter(key => key.includes("POLAR")));
            return new Response(JSON.stringify({ error: "Webhook secret not configured for the current environment" }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }

        // Here you would typically verify the webhook signature using the webhook secret
        // This is a placeholder for webhook signature verification
        console.log(`Using ${environment} webhook secret:`, webhookSecret.substring(0, 4) + "...");

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
        // Determine environment based on NODE_ENV
        const environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
        console.log("Initializing Polar SDK with environment for dashboard:", environment);
        console.log("Current NODE_ENV for dashboard:", process.env.NODE_ENV);
        
        // Select the appropriate token based on environment
        const accessToken = environment === "production" 
            ? process.env.POLAR_PRODUCTION_ACCESS_TOKEN 
            : process.env.POLAR_SANDBOX_ACCESS_TOKEN || process.env.POLAR_ACCESS_TOKEN; // Try fallback to POLAR_ACCESS_TOKEN
            
        if (!accessToken) {
            console.error(`${environment === "production" ? "POLAR_PRODUCTION_ACCESS_TOKEN" : "POLAR_SANDBOX_ACCESS_TOKEN"} is not configured for dashboard`);
            console.error("Available POLAR environment variables:", Object.keys(process.env).filter(key => key.includes("POLAR")));
            throw new Error("Polar access token is not configured for the current environment");
        }
        
        const polar = new Polar({
            server: environment as "production" | "sandbox",
            accessToken: accessToken,
        });

        console.log(`Initialized Polar SDK with ${environment} token:`, accessToken.substring(0, 8) + "...");
        console.log(`Using server parameter:`, environment);

        try {
            console.log("Creating customer session for customer ID:", args.customerId);
            const result = await polar.customerSessions.create({
                customerId: args.customerId,
            });

            console.log("Customer session created successfully with URL:", result.customerPortalUrl);
            // Only return the URL to avoid Convex type issues
            return { url: result.customerPortalUrl };
        } catch (error) {
            console.error("Error creating customer session:", error);
            throw new Error("Failed to create customer session");
        }
    }
});

// Test function to simulate a subscription webhook event
export const simulateSubscriptionWebhook = mutation({
  args: {
    userId: v.string(),
    planKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, planKey } = args;
    
    // Get the plan details
    const plan = await ctx.db
      .query("plans")
      .withIndex("key", (q: any) => q.eq("key", planKey))
      .unique();
    
    if (!plan) {
      throw new Error(`Plan ${planKey} not found`);
    }
    
    // Get the price amount from the plan
    const priceAmount = plan.prices?.month?.usd?.amount || 0;
    
    // Create a mock webhook event payload
    const mockWebhookPayload = {
      type: "subscription.created",
      data: {
        id: `test-subscription-${Date.now()}`,
        price_id: plan.polarProductId || "test-price-id",
        currency: "USD",
        recurring_interval: "month",
        metadata: {
          userId: userId,
          plan: planKey
        },
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        amount: priceAmount,
        started_at: new Date().toISOString(),
        customer_id: `test-customer-${Date.now()}`
      }
    };
    
    // Call the webhook handler function directly
    await updateUserPlan(ctx, userId, planKey);
    
    // Also create the subscription record
    await ctx.db.insert("subscriptions", {
      polarId: mockWebhookPayload.data.id,
      polarPriceId: mockWebhookPayload.data.price_id,
      currency: mockWebhookPayload.data.currency,
      interval: mockWebhookPayload.data.recurring_interval,
      userId: userId,
      status: mockWebhookPayload.data.status,
      currentPeriodStart: new Date(mockWebhookPayload.data.current_period_start).getTime(),
      currentPeriodEnd: new Date(mockWebhookPayload.data.current_period_end).getTime(),
      cancelAtPeriodEnd: mockWebhookPayload.data.cancel_at_period_end,
      amount: mockWebhookPayload.data.amount,
      startedAt: new Date(mockWebhookPayload.data.started_at).getTime(),
      customerId: mockWebhookPayload.data.customer_id,
      metadata: mockWebhookPayload.data.metadata || {},
    });
    
    return {
      success: true,
      message: `Simulated subscription webhook for user ${userId} with plan ${planKey}`,
      webhookPayload: mockWebhookPayload
    };
  }
});

// Get subscriptions for a user
export const getUserSubscriptions = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    
    return await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
  }
});

// Debug function to check environment variables
export const debugEnvironmentVariables = action({
  handler: async (ctx) => {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      POLAR_PRODUCTION_ACCESS_TOKEN_EXISTS: !!process.env.POLAR_PRODUCTION_ACCESS_TOKEN,
      POLAR_SANDBOX_ACCESS_TOKEN_EXISTS: !!process.env.POLAR_SANDBOX_ACCESS_TOKEN,
      POLAR_ACCESS_TOKEN_EXISTS: !!process.env.POLAR_ACCESS_TOKEN,
      FRONTEND_URL: process.env.FRONTEND_URL,
      FRONTEND_URL_DEV: process.env.FRONTEND_URL_DEV,
      ALL_ENV_KEYS: Object.keys(process.env),
      POLAR_KEYS: Object.keys(process.env).filter(key => key.includes("POLAR")),
    };
    
    console.log("Debug environment variables:", envVars);
    
    return envVars;
  }
});
