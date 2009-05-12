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
