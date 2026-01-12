## Packages
recharts | For the scatter plot visualization of media positioning
date-fns | For formatting dates in a journalistic style
framer-motion | For smooth page transitions and micro-interactions

## Notes
Admin features require 'x-admin-token' header which we'll handle in a custom fetch wrapper or interceptor pattern.
The API uses `credentials: "include"` for session cookies if auth was session-based, but instructions specify a simple token for admin. We'll use localStorage.
