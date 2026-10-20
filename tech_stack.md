Initial planning:
- track overdue invoices
- send reminders to customers about pending payments (3 days before due date)
- provide real-time updates on invoice status (paid, pending, overdue)
- integrate with a database to store invoice information and customer details
- For overdue invoices:
  - first week overdue: send a reminder message to the customer
  - second week overdue: inform the seller about the overdue invoice and notify the customer again
  - third week overdue: escalate the issue to seller and suggest possible actions (offer payment plans)
- dashboard for the seller to check how much money is collected, how many invoices are pending, and how many are overdue.
- Dataset: https://www.kaggle.com/datasets/rajattomar132/payment-date-dataset 
- Telegram bot to send message to seller about today's summary of invoices (paid, pending, overdue) and any overdue invoices that need attention.

Requirements:
- must be compatible with Replit environment
- telegram API integration for communication
- runpod and ollama for localhost testing compatibility for hosting the agent