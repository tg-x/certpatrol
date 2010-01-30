Your web browser trusts a lot of certification authorities and chained
sub-authorities, and it does so blindly. "Subordinate certification
authorities" are a little known device: The root CAs in your browser can
delegate permission to issue certificates to an unlimited amount of
subordinate CAs (SCA) just by signing their certificate, not by
borrowing their precious private key to them. Even Wikipedia doesn't
mention this, nor do any public transparent listings exist of all the
sub-CAs that your browser trusts every day. It might be virtually
impossible to tell how many CAs you are trusting de-facto.

Revealing this and other inner workings of X.509 to end users is deemed
as being too difficult for them to handle. You however are an advanced
user, who wants to keep track on when certificates are updated and make
sure none of the many authorities you involuntarily need to trust to
have a working web browsing experience, abuses your trust allowing
someone to read into your HTTPS communications by means of a subtle man
in the middle attack. Still, this is a very paranoid thing to expect to
happen, so only use this if you think you are sufficiently paranoid.

== VERSION 0.6 ==

This version has been improved to show and store the complete information about certificates, which makes it a lot more useful when a certificate is updated: You can now decide for yourself if expiry was due, if a change of issuer is acceptable, or if a phone call to the affected company is appropriate to get a voice confirmation of such a new certificate. We have tentatively added support for Thunderbird, Songbird, SeaMonkey, Mozilla and Fennec. Concerning Firefox, this version is a release candidate for Certificate Patrol 1.0 as this version implements all we expect from a 1.0.

== VERSION 0.7 ==

Allow to copy & paste data from pop-up.

== VERSION 1.0 ==

Nothing changed. Version 0.7 has proven to be super stable,
therefore we move from "release candidate" directly to 1.0.


== HOW TO TEST ==

You'll see certificate information pop up whenever you visit a
new https: website, including https://addons.mozilla.org for
example. "New" is anything Patrol hasn't seen and stored yet.

To manually trigger seeing a website replace its certificate, 
you can do one of these steps:

* Have an https website yourself and change the certificate.
* Manually have an address in /etc/hosts point to this or that
  https: IP address and add many security exceptions to Firefox
  in order for Patrol to even get to do its warning part.
* Use an Sqlite editor like the "SQLite Manager" add-on, edit
  the CertPatrol.sqlite file and modify any of the fingerprints
  of an https: website you have visited before. This way, Patrol
  will think it has seen that website using a different certificate
  than it actually does, so as soon as you go to that website it
  will warn you of an apparent change in certificate.
* Be lucky and actually run into a regular certificate upgrade.



======/--------
TODO / WISHLIST
====/----------

 - convert validity dates to iso standard.
   the american mm/dd/yy order is very confusing.
   only iso using yyyy-mm-dd makes sense for everyone
    ? maybe even show how many days that is from today?
 + green/yellow/red indicator
    - if only the expiry has been updated, and the old
      certificate was to expire within the next 3 months,
      show green.
    - if the expiry was not due, but the issuer is still
      the same, show lime.
    - if the expiry was due, but the issuer has changed,
      show yellow.
    - if issuer has changed while expiry was not due, 
      show red.
 + preferences panel
    ? option to suppress certificate-added popups?
    ? option to wildcard-excempt annoying domains?
