#V=0.xx
N=certpatrol

# firefox 4 recommends no longer using jar files.. TODO

.SUFFIXES: .pjs .js

.pjs.js: Makefile
	prep $*.pjs > content/$@

it: *.js
#	-ln -f CertPatrol.js content
	./build.sh
	cp -p $N.xpi /dev/shm

up:
	scp -P 2222 $N.xpi f:psyc/psyced.org/world/mozilla

#olddist:
#	zip -9r $N-$V.xpi chrome defaults *.* Makefile -x \*/CVS/\*
#	mv $N-$V.xpi /dev/shm
#	@echo About to copy the new version to the website.. yes?
#	@sleep 7
#	scp /dev/shm/$N-$V.xpi f:p/Xtra/$N.xpi

clean:
	-rm *.xpi

reset:
	git reset --hard

# Some things to look at when doing extensions.
#
# http://addons.mozilla.org/developers/
# https://addons.mozilla.org/en-US/developers/docs/reference
# https://developer.mozilla.org/en/CSS_Reference
# http://developer.mozilla.org/en/docs/Building_an_Extension
# http://developer.mozilla.org/en/docs/Installing_Extensions_and_Themes_From_Web_Pages
# http://developer.mozilla.org/en/docs/Extension_Versioning%2C_Update_and_Compatibility#Securing_Updates
# https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/
#
# XUL Examples: http://www.hevanet.com/acorbin/xul/top.xul
