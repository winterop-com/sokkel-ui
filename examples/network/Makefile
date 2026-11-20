# Network watch: every connection in and out of a machine, mapped, tabled and charted, with alerts. `make help` lists the targets.

PORT := 4199

include ../example.mk

geolite: ## Download GeoLite2 City into geolite/, reading the license key from 1Password (MAXMIND_LICENSE_REF)
	scripts/geolite.sh
