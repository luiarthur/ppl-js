count:
	find src -name '*.js' | xargs wc -l

serve:
	python3 -m http.server 8000
