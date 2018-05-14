---
layout: post
title: SSO and SAML 
categories: blog
disqus: y
---

Single Sign-On (SSO) is ...

A common approach is to use OAuth for both authentication and authorisation. Examples include logging into a service with a Google or Facebook account.
The user is redirected to Google or Facebook and asked to grant permission to the service to access certain attributes such as an email address or contact list.

In enterprise applications, SAML is often used for authentication and is usually used once per session.

SP  - Service Provider
IdP - Identity Provider
SSO - Single Sign On
SLS - Single Logout Service
ACS - 
SLO - Single Logout
Assertion - (what is an assertion)
Signed - (what is signed)
Encrypted -  (what is encrypted)

### SAML Login Flow

1. User navigates to SP application
1. User gets redirected via `/sso` API to IdP login page
1. User logs into IdP (if needed)
1. IdP sends a POST request to SP's `/acs` API
1. Once SP verifies ACS request is valid it log the user in

### SAML Logout Flow

1. User logs out of SP application via `/slo` API
1. SP may choose to send a logout request to the IdP

### SAML Single Logout Service

1. IdP admin logs out user via IdP interface
1. IdP sends request to SP's `/sls` API
1. SP verifies the request and logs the user out

## Resources

[OneLogin]() provides invaluable resources to setup and test SAML integration in an application.

Once your application has been set up, you can attempt to connect it to an Active Directory (ADFS) instance.

## References
