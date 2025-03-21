export default {
  providers: [
    {
      domain: "https://alert-kangaroo-21.clerk.accounts.dev",
      applicationID: "convex",
    },
    // Production Clerk domain
    {
      domain: "https://clerk.sereni.day", // Add your production Clerk domain
      applicationID: "convex",
    },
  ]
};