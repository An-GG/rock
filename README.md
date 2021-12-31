# rock


script which will
- start the ngrok client
- write ngrock endpoint url to `~/.rock/endpoint.txt`
- commit and push this file to a private git repo

**Install**

Clone this repo, then run `npm i -g ./` in the root of this project.

**Usage**

Create a git repo at `~/.rock` and make sure `git push --force` and `ngrok` works, then start `rock <ngrok args>`, or just `rock` for default ssh configuration.


![alt text](https://www.cs.utexas.edu/~angg/rock.png)