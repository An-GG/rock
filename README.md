# rock

![alt text](https://www.cs.utexas.edu/~angg/rock.png)

## what rock??

script which will
- start the ngrok client
- write ngrock endpoint url to `~/.rock/endpoint.txt`
- commit and push this file to a private git repo
- can automatically start on system startup

## install rock

```
npm i -g @an-gg/rock
``` 
or

Clone this repo, then run `npm i -g ./` in the root of this project.

## use rock

Create a git repo at `~/.rock` and make sure `git push --force` and `ngrok` works, then:
```sh
$ rock
```
or 
```sh
$ rock <ngrok args>
```

## make rock autostart
```sh
$ sudo rock autostart enable
```