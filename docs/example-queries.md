# Example Queries for Claude with Microsoft Graph API

This document provides examples of queries you can ask Claude that utilize the Microsoft Graph API integration. Use these as templates for your own interactions.

## User Management Queries

### Basic User Information

```
Who are the top 5 users in our organization based on job title?
```

Claude will use:
```javascript
await graphFunctions.getUsers({
  queryParams: {
    '$select': 'id,displayName,mail,jobTitle',
    '$orderby': 'jobTitle',
    '$top': 5
  }
});
```

### Department Analysis

```
How many users do we have in each department? Show me a breakdown.
```

Claude will:
1. Fetch all users with department information
2. Group and count by department
3. Present a structured breakdown

### License Usage

```
Which users have Microsoft 365 E5 licenses assigned but haven't accessed their account in the last 30 days?
```

Claude will use multiple Graph API queries to:
1. Get users with specific license SKUs
2. Check their sign-in activity
3. Filter and report inactive users

## Group Management Queries

### Group Membership

```
Who are the members of the "Finance Team" group?
```

Claude will:
1. Search for the group by name
2. Get the group members
3. Format and return the list

### Group Ownership

```
Which groups don't have an owner assigned?
```

Claude will query groups and filter those without owners.

### Distribution Lists

```
Show me all distribution lists with external members.
```

Claude will identify distribution lists and check for external members.

## Security Analysis

### Account Security

```
Which users don't have multi-factor authentication enabled?
```

Claude will query user authentication methods.

### Guest Accounts

```
How many guest accounts were created in the last 3 months, and who invited them?
```

Claude will analyze guest accounts, creation dates, and inviter information.

### Administrator Accounts

```
List all users with admin roles in our organization.
```

Claude will query directory roles and their members.

## Teams and Collaboration

### Team Analysis

```
Which Microsoft Teams have the most channels?
```

Claude will query teams and their channels.

### Meeting Insights

```
Who organized the most Teams meetings last month?
```

Claude will analyze calendar events and organizer statistics.

### Site Usage

```
What are our most active SharePoint sites based on recent activity?
```

Claude will query site activity metrics.

## Organizational Insights

### Reporting Structure

```
Show me the reporting structure for the Marketing department.
```

Claude will build a hierarchical view of the reporting structure.

### Location Distribution

```
How many employees do we have in each office location?
```

Claude will analyze user locations and provide a distribution.

### Skill Assessment

```
Find all employees who list "Python" as a skill in their profile.
```

Claude will search user profiles for specific skills.

## Custom Queries

### Advanced Filtering

```
Find all groups created in the last year that have no activity in the past 30 days.
```

Claude will combine temporal queries with activity metrics.

### Cross-Resource Analysis

```
Which users have access to the confidential-documents SharePoint site but haven't accessed it in 6 months?
```

Claude will correlate site permissions with activity logs.

### Compliance Reporting

```
Generate a report of all shared files containing potentially sensitive information.
```

Claude will analyze file sharing and content classifications.