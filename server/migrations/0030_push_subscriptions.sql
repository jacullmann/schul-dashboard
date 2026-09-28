-- Web Push subscriptions, one per browser that opted in. Each is bound to the
-- login session (refresh token family) that registered it, so logging out or
-- revoking that session silences the device without a separate cleanup step.
CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    session_family_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id
    ON public.push_subscriptions USING btree (user_id);

CREATE INDEX idx_push_subscriptions_session_family_id
    ON public.push_subscriptions USING btree (session_family_id);
