#V=0.xx
N=certpatrol

.SUFFIXES: .pjs .js

$N.xpi: content/CertPatrol.js build.sh chrome.manifest install.rdf install.js content locale defaults
	./build.sh

it: $N.xpi
	cp -p $N.xpi /dev/shm

content/CertPatrol.js: CertPatrol.pjs
	@rm -f $@
	prep CertPatrol.pjs > $@
	@chmod a-w $@

up:
	scp -P 2222 $N.xpi f:psyc/psyced.org/world/mozilla

clean:
	-rm *.xpi

reset:
	git reset --hard

#olddist:
#	zip -9r $N-$V.xpi chrome defaults *.* Makefile -x \*/CVS/\*
#	mv $N-$V.xpi /dev/shm
#	@echo About to copy the new version to the website.. yes?
#	@sleep 7
#	scp /dev/shm/$N-$V.xpi f:p/Xtra/$N.xpi

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
