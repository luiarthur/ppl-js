PORT = 8000

count:
	find src -name '*.js' | xargs wc -l

serve:
	@echo Open a browser at https://localhost:$(PORT)
	python3 -m http.server $(PORT)
