import { api, unwrapData } from '../../app/api';

const invalidateBilling = ['Subscription', 'Me'];

export const subscriptionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getSubscription: build.query({
      query: () => '/subscriptions/me',
      transformResponse: unwrapData,
      providesTags: ['Subscription'],
    }),
    createCheckoutSession: build.mutation({
      query: () => ({ url: '/subscriptions/checkout', method: 'POST' }),
      transformResponse: unwrapData,
    }),
    confirmCheckoutSession: build.mutation({
      query: (sessionId) => ({ url: '/subscriptions/checkout/confirm', method: 'POST', body: { sessionId } }),
      transformResponse: unwrapData,
      invalidatesTags: invalidateBilling,
    }),
    openBillingPortal: build.mutation({
      query: () => ({ url: '/subscriptions/portal', method: 'POST' }),
      transformResponse: unwrapData,
    }),
    cancelSubscription: build.mutation({
      query: () => ({ url: '/subscriptions/cancel', method: 'POST' }),
      transformResponse: unwrapData,
      invalidatesTags: invalidateBilling,
    }),
    resumeSubscription: build.mutation({
      query: () => ({ url: '/subscriptions/resume', method: 'POST' }),
      transformResponse: unwrapData,
      invalidatesTags: invalidateBilling,
    }),
  }),
});

export const {
  useGetSubscriptionQuery,
  useCreateCheckoutSessionMutation,
  useConfirmCheckoutSessionMutation,
  useOpenBillingPortalMutation,
  useCancelSubscriptionMutation,
  useResumeSubscriptionMutation,
} = subscriptionsApi;
