INSERT INTO email_templates (id, trigger, subject, body, enabled) VALUES

(gen_random_uuid(), 'stage_enquired',
 'We''ve received your application, {{first_name}}!',
 'Hi {{first_name}},

Thank you for applying — we''ve received your application and will be in touch soon.

You can log in to your portal at any time to check your status:
{{portal_link}}',
 true),

(gen_random_uuid(), 'stage_approved',
 'Your application has been approved, {{first_name}}!',
 'Hi {{first_name}},

Great news — your application has been approved! The next step is to upload your required documents so we can add you to the waitlist.

Upload your documents here:
{{documents_link}}

Log in to your portal:
{{portal_link}}',
 true),

(gen_random_uuid(), 'stage_waitlisted',
 'You''re on the waitlist, {{first_name}}!',
 'Hi {{first_name}},

You''ve been added to our waitlist. We''ll be in touch as soon as a suitable puppy becomes available.

Keep an eye on your portal for updates:
{{portal_link}}',
 true),

(gen_random_uuid(), 'stage_puppy_reserved',
 'Your puppy is reserved, {{first_name}}!',
 'Hi {{first_name}},

A puppy has been reserved for you! Please complete your booking payment within 24 hours to secure your spot.

Log in to your portal:
{{portal_link}}',
 true),

(gen_random_uuid(), 'stage_puppy_booked',
 'Your puppy is booked, {{first_name}}!',
 'Hi {{first_name}},

Your puppy is officially booked — congratulations! We''ll be in touch with next steps.

Log in to your portal for updates:
{{portal_link}}',
 true),

(gen_random_uuid(), 'stage_puppy_fully_paid',
 'All done — see you soon, {{first_name}}!',
 'Hi {{first_name}},

Your payment is complete — everything is sorted! We''ll be in touch shortly to arrange collection.

Log in to your portal:
{{portal_link}}',
 true),

(gen_random_uuid(), 'docs_received',
 'We''ve received your documents, {{first_name}}',
 'Hi {{first_name}},

Thank you — we''ve received all your documents and they are now being reviewed. We''ll be in touch soon.

Log in to your portal:
{{portal_link}}',
 true),

(gen_random_uuid(), 'payment_confirmed',
 'Payment received, {{first_name}}',
 'Hi {{first_name}},

We''ve received your payment of {{amount}} — thank you!

Log in to your portal to view your payment history:
{{payments_link}}',
 true),

(gen_random_uuid(), 'puppy_booked',
 'Your puppy is booked, {{first_name}}!',
 'Hi {{first_name}},

{{puppy_name}} is now officially booked for you. We''re so excited for you!

Log in to your portal for updates:
{{portal_link}}',
 true),

(gen_random_uuid(), 'puppy_booking_requested',
 'Complete your booking for {{puppy_name}}, {{first_name}}',
 'Hi {{first_name}},

You''ve expressed interest in {{puppy_name}}! To secure your booking, please complete your payment of {{amount}} within {{expires_in}}.

{{credit_applied}}

Complete your payment here:
{{payment_url}}

Or log in to your portal:
{{payments_link}}',
 true),

(gen_random_uuid(), 'puppy_booking_expired',
 'Your booking window has expired, {{first_name}}',
 'Hi {{first_name}},

Unfortunately your 24-hour booking window for {{puppy_name}} has expired and the puppy has been released back to the waitlist.

If you''d still like a puppy, you can view available litters in your portal:
{{portal_link}}',
 true),

(gen_random_uuid(), 'final_payment_requested',
 'Your final payment is ready, {{first_name}}',
 'Hi {{first_name}},

Your final payment of {{amount}} is now due for {{puppy_name}}.

Total price: {{total_price}}
Already paid: {{already_paid}}

Complete your payment here:
{{payment_url}}

Or log in to your portal:
{{payments_link}}',
 true),

(gen_random_uuid(), 'reservation_cancelled',
 'Your reservation has been cancelled, {{first_name}}',
 'Hi {{first_name}},

Unfortunately your reservation for {{puppy_name}} has been cancelled. Please contact us if you have any questions.

Log in to your portal:
{{portal_link}}',
 true),

(gen_random_uuid(), 'litter_notified',
 'A new litter is available, {{first_name}}!',
 'Hi {{first_name}},

We have a new litter available that you may be interested in — {{litter_name}} ({{litter_breed}}).

Expected date: {{litter_expected_date}}

View the litter in your portal:
{{litter_link}}',
 true);