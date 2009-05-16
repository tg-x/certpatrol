#V=0.4.0.6
N=certpatrol

it:
	./build.sh
	cp -p $N.xpi /dev/shm

olddist:
	zip -9r $N-$V.xpi chrome defaults *.* Makefile -x \*/CVS/\*
	mv $N-$V.xpi /dev/shm
	@echo About to copy the new version to the website.. yes?
	@sleep 7
	scp /dev/shm/$N-$V.xpi f:p/Xtra/$N.xpi

clean:
	-rm *.xpi

# Some things to look at when doing extensions.
#
# http://addons.mozilla.org/developers/
# http://developer.mozilla.org/en/docs/Building_an_Extension
# http://developer.mozilla.org/en/docs/Installing_Extensions_and_Themes_From_Web_Pages
# http://developer.mozilla.org/en/docs/Extension_Versioning%2C_Update_and_Compatibility#Securing_Updates
#
# XUL Examples: http://www.hevanet.com/acorbin/xul/top.xul
