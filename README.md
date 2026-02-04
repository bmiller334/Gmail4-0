# AI-Powered Email Sorter & Dashboard

## Project Vision
This project aims to automate the organization of a personal Gmail inbox using the Gemini API and Google Cloud Platform. The goal is to maintain an empty inbox ("Inbox Zero") by automatically sorting incoming emails into static categories while keeping them unread for review. Additionally, a front-end dashboard will provide insights and statistics about email traffic.

## Key Requirements & Workflow

1.  **Email Ingestion & Event Listening**:
    *   Utilize Google Cloud Platform (GCP) to handle processing, bypassing Google Apps Script execution time limits.
    *   Implement a Gmail Push Notification system (using Cloud Pub/Sub) to act as an event listener. This will trigger the sorting script immediately upon the arrival of a new email.

2.  **AI Analysis & Categorization**:
    *   The core logic will use the Gemini API.
    *   The model will analyze the email's Title, Sender, and Body to determine the appropriate category.
    *   Categories will be pre-defined (static).

3.  **Action & State Management**:
    *   **Move, Don't Mark Read**: Emails will be removed from the main "Inbox" and applied with a Label corresponding to their determined category.
    *   **Unread Status**: Crucially, emails must remain **UNREAD** in their new folders/labels so the user can track what needs review.

4.  **Front-End Dashboard**:
    *   A personal homepage component to display analytics.
    *   **Stats**:
        *   Processing metrics (success rates, volume).
        *   Sender frequency (e.g., number of emails from a single sender).
        *   Anomaly detection: Spikes in marketing emails from specific companies.
        *   "Missed Email" detection heuristics.

## Concerns & Challenges

*   **Gmail API Quotas**: Frequent polling or high-volume push notifications might hit Gmail API usage limits (though Pub/Sub mitigates polling, API calls to fetch content still apply).
*   **Latency**: While "real-time", there will be a slight delay between email arrival and sorting/moving. The user might see the email in the inbox briefly.
*   **Gemini Costs & Latency**: Processing every single email through an LLM might incur costs or latency issues if volume is high. Cost optimization (batching or filtering obvious spam before LLM) might be needed.
*   **Authentication**: Managing OAuth tokens for persistent background access (offline access) on GCP requires secure storage (Secret Manager).
*   **Complex Filtering**: Distinguishing "Missed emails" vs "Ignored emails" is subjective and might require user feedback loops to train or prompt the model correctly.

## Disclaimer: Knowledge Base Limitations

**Note on Development**: The Gemini AI model used to assist in generating code for this project relies on a knowledge base that may not be fully up-to-date with the latest changes in Google Cloud Platform (GCP), Firebase, or third-party libraries. GCP interfaces and SDKs evolve frequently. If we encounter deprecated methods or changed configuration flows, we will need to consult the official documentation and adapt the implementation manually.
