/* ---- DON'T EDIT BELOW ---- */

var Plume = Plume || {};

Plume = (function (window, document) {
    'use strict';

    var config = Plume.config || {};

    // RDF
    var PROXY = "https://databox.me/,proxy?uri={uri}";
    var TIMEOUT = 5000;

    $rdf.Fetcher.crossSiteProxyTemplate = PROXY;
    // common vocabs
    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
    var OWL = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
    var PIM = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
    var UI = $rdf.Namespace("http://www.w3.org/ns/ui#");
    var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
    var LDP = $rdf.Namespace("http://www.w3.org/ns/ldp#");
    var MBLOG = $rdf.Namespace("http://www.w3.org/ns/mblog#");
    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
    var TAGS = $rdf.Namespace("http://www.holygoat.co.uk/owl/redwood/0.1/tags/");

    // init markdown editor
    var editor = new SimpleMDE({
        status: false,
        spellChecker: false,
        initialValue: 'This is a markdown editor, type something...'
    });
    // hljs.initHighlightingOnLoad();
    var parseMD = function(data) {
        if (data) {
            return editor.markdown(data);
        }
        return '';
    };
    // Get params from the URL
    var queryVals = (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=', 2);
            if (p.length == 1)
                b[p[0]] = "";
            else
                b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'));

    // sanitize value from form
    var getBodyValue = function() {
        var val = editor.codemirror.getValue();
        return val.replace('"', '\"');
    };
    var setBodyValue = function(val) {
        editor.value(val);
    }

    var user = {
        name: "John Doe",
        webid: "https://example.org/user#me",
        picture: "img/icon-blue.svg"
    };

    var posts = {};
    var authors = {};

    var appURL = window.location.origin+window.location.pathname;

    // Initializer
    var init = function() {
        // Set default config values
        document.querySelector('.blog-picture').src = config.picture;
        document.querySelector('.blog-title').innerHTML = config.title;
        document.querySelector('.blog-tagline').innerHTML = config.tagline;

        // append trailing slash to data path if missing
        if (config.defaultPath.lastIndexOf('/') < 0) {
            config.defaultPath += '/';
        }

        // set auth URL
        var url = (config.dataContainer)?config.dataContainer:appURL;

        // Get the current user
        Solid.isAuthenticated(url).then(function(webid){
            if (webid.length === 0) {
                console.log("Could not find WebID from User header, or user is not authenticated. Used "+url);
                initContainer();
            } else if (webid.slice(0, 4) == 'http') {
                // fetch and set user profile
                Solid.getWebIDProfile(webid).then(function(g) {
                    getUserProfile(webid, g).then(function(profile){
                        // set WebID
                        user.webid = profile.webid;
                        user.name = profile.name;
                        user.picture = profile.picture;
                        // add self to authors list
                        authors[webid] = user;
                        console.log(user);

                        // add new post button if owner
                        if (config.owner == webid) {
                            document.querySelector('.nav').classList.remove('hidden');
                        }

                        initContainer();
                    });
                });
            }
        });

        // Personalize blog app
        var header = document.querySelector('.header');
        var header_height = getComputedStyle(header).height.split('px')[0];
        var nav = document.querySelector('.nav');
        var pic = document.querySelector('.blog-picture');
        var pic_height = getComputedStyle(pic).height.split('px')[0];
        var diff = header_height - pic_height;

        function stickyScroll(e) {
            if (window.pageYOffset > (diff + 50)) {
                nav.classList.add('fixed-nav');
            }

            if(window.pageYOffset < (diff + 50)) {
                nav.classList.remove('fixed-nav');
            }
        }

        if (queryVals['view'] && queryVals['view'].length > 0) {
            var url = decodeURIComponent(queryVals['view']);
            showViewer(url);
        } else if (queryVals['edit'] && queryVals['edit'].length > 0) {
            var url = decodeURIComponent(queryVals['edit']);
            showEditor(url);
        } else if (queryVals['new'] !== undefined) {
            showEditor();
        }

        // Scroll handler to toggle classes.
        window.addEventListener('scroll', stickyScroll, false);
    };

    // Init data container
    var initContainer = function() {
        if (config.dataContainer.length === 0) {
            Solid.resourceStatus(appURL+config.defaultPath).then(
                function(container) {
                    // create data container for posts if it doesn't exist
                    if (!container.exists && container.err === null) {
                        Solid.newResource(appURL, config.defaultPath, null, true).then(
                            function(res) {
                                if (res.url && res.url.length > 0) {
                                    config.dataContainer = res.url;
                                }
                                // add dummy post
                                var acme = {
                                    title: "Welcome to Plume, a Solid blogging platform",
                                    author: user.webid,
                                    date: "3 Dec 2015",
                                    body: "```\nHellowWorld();\n```\n\n**Note!** This is a demo post created under your name. Feel free to remove it whenever you wish.\n\n*Plume* is a 100% client-side application built using [Solid standards](https://github.com/solid/), in which data is decoupled from the application itself. This means that you can host the application on any Web server, without having to install anything -- no database, no messing around with Node.js, it has 0 dependencies! It also means that other similar applications will be able to reuse the data resulting from your posts, without having to go through a complicated API.\n\nPlume uses [Markdown](https://en.wikipedia.org/wiki/Markdown) to provide you with the easiest and fastest experience for writing beautiful articles. Click the *Edit* button below to see this article.\n\nGive it a try, write your first post!",
                                    tags: [
                                        { color: "#df2d4f", name: "Decentralization" },
                                        { color: "#4d85d1", name: "Solid" }
                                    ]
                                };
                                savePost(acme);
                            }
                        )
                        .catch(
                            function(err) {
                                console.log("Could not create data container for posts.");
                                console.log(err);
                                notify('error', 'Could not create data container');
                            }
                        );
                    } else if (container.exists) {
                        config.dataContainer = appURL+config.defaultPath;
                        fetchPosts();
                    }
                }
            );
        } else {
            fetchPosts();
        }
    }

    // get profile data for a given user
    // Returns
    // webid: "https://example.org/user#me"
    // name: "John Doe",
    // picture: "https://example.org/profile.png"
    var getUserProfile = function(webid, g) {
        var promise = new Promise(function(resolve) {
            var profile = {};
            var webidRes = $rdf.sym(webid);

            console.log(webid, webidRes);
            console.log(g.toNT());

            // set webid
            profile.webid = webid;

            // set name
            var name = g.any(webidRes, FOAF('name'));
            console.log("Name: "+name);
            if (name && name.value.length > 0) {
                profile.name = name.value;
            } else {
                profile.name = '';
                // use familyName and givenName instead of full name
                var givenName = g.any(webidRes, FOAF('familyName'));
                if (givenName) {
                    profile.name += givenName.value;
                }
                var familyName = g.any(webidRes, FOAF('familyName'));
                if (familyName) {
                    profile.name += (givenName)?' '+familyName.value:familyName.value;
                }
                // use nick
                if (!givenName && !familyName) {
                    var nick = g.any(webidRes, FOAF('nick'));
                    if (nick) {
                        profile.name = nick.value;
                    }
                }
            }

            // set picture
            var pic, img = g.any(webidRes, FOAF('img'));
            if (img) {
                pic = img;
            } else {
                // check if profile uses depic instead
                var depic = g.any(webidRes, FOAF('depiction'));
                if (depic) {
                    pic = depic;
                }
            }
            if (pic && pic.uri.length > 0) {
                profile.picture = pic.uri;
            }

            console.log(profile);

            resolve(profile);
        });

        return promise;
    };

    var confirmDelete = function(url) {
        var postTitle = (posts[url].title)?'<br><p><strong>'+posts[url].title+'</strong></p>':'this post';
        var div = document.createElement('div');
        div.id = 'delete';
        div.classList.add('dialog');
        var section = document.createElement('section');
        section.innerHTML = "You are about to delete "+postTitle;
        div.appendChild(section);

        var footer = document.createElement('footer');

        var del = document.createElement('button');
        del.classList.add("button");
        del.classList.add('danger');
        del.classList.add('float-left');
        del.setAttribute('onclick', 'Plume.deletePost(\''+url+'\')');
        del.innerHTML = 'Delete';
        footer.appendChild(del);
        // delete button
        var cancel = document.createElement('button');
        cancel.classList.add('button');
        cancel.classList.add('float-right');
        cancel.setAttribute('onclick', 'Plume.cancelDelete()');
        cancel.innerHTML = 'Cancel';
        footer.appendChild(cancel);
        div.appendChild(footer);

        // append to body
        document.querySelector('body').appendChild(div);
    };

    var cancelDelete = function() {
        document.getElementById('delete').remove();
    };

    var deletePost = function(url) {
        if (url) {
            Solid.deleteResource(url).then(
                function(done) {
                    if (done) {
                        delete posts[url];
                        document.getElementById(url).remove();
                        document.getElementById('delete').remove();
                        notify('success', 'Successfully deleted post');
                        resetAll();
                    }
                }
            )
            .catch(
                function(err) {
                    notify('error', 'Could not delete post');
                    resetAll();
                }
            );
        }
    };

    var showViewer = function(url) {
        var viewer = document.querySelector('.viewer');
        var article = addPostToDom(posts[url]);
        if (!article) {
            resetAll();
            return;
        }
        // append article
        viewer.appendChild(article);
        var footer = document.createElement('footer');
        viewer.appendChild(footer);
        // add separator
        var sep = document.createElement('h1');
        sep.classList.add('content-subhead');
        footer.appendChild(sep);
        // create button list
        var buttonList = document.createElement('div');
        var back = document.createElement('button');
        back.classList.add("button");
        back.setAttribute('onclick', 'Plume.resetAll()');
        back.innerHTML = '≪ Go back';
        buttonList.appendChild(back);
        // append button list to viewer
        footer.appendChild(buttonList);
        // hide main page
        document.querySelector('.posts').classList.add('hidden');
        document.querySelector('.viewer').classList.remove('hidden');

        window.history.pushState("", document.querySelector('title').value, window.location.pathname+"?view="+encodeURIComponent(url));
    }

    var showEditor = function(url) {
        var tags = document.querySelector('.editor-tags');
        var appendTag = function(name, color) {
            var tagDiv = document.createElement('div');
            tagDiv.classList.add('post-category');
            tagDiv.classList.add('inline-block');
            if (color) {
                tagDiv.setAttribute('style', 'background:'+color+';');
            }
            var span = document.createElement('span');
            span.innerHTML = name;
            tagDiv.appendChild(span);
            var tagLink = document.createElement('a');
            tagLink.setAttribute('onclick', 'this.parentElement.remove()');
            tagLink.innerHTML = 'x';
            tagDiv.appendChild(tagLink);
            tags.appendChild(tagDiv);
            // clear input
            document.querySelector('.editor-add-tag').value = '';
        };

        document.querySelector('.nav').classList.add('hidden');
        document.querySelector('.posts').classList.add('hidden');
        document.querySelector('.viewer').classList.add('hidden');
        document.querySelector('.start').classList.add('hidden');
        document.querySelector('.editor').classList.remove('hidden');
        document.querySelector('.editor-title').focus();
        document.querySelector('.editor-author').innerHTML = user.name;
        document.querySelector('.editor-date').innerHTML = formatDate();
        document.querySelector('.editor-tags').innerHTML = '';
        document.querySelector('.editor-add-tag').value = '';
        setBodyValue('');

        // add event listener for tags
        document.querySelector('.editor-add-tag').onkeypress = function(e){
            if (!e) e = window.event;
            var keyCode = e.keyCode || e.which;
            if (keyCode == '13'){
                appendTag(document.querySelector('.editor-add-tag').value, document.querySelector('.color-picker').style.background);
            }
        }

        // preload data if updating
        if (url && url.length > 0) {
            var post = posts[url];
            if (post.title) {
                document.querySelector('.editor-title').value = post.title;
            }
            if (post.author) {
                var author = getAuthorByWebID(post.author);
                document.querySelector('.editor-author').innerHTML = author.name;
            }
            if (post.created) {
                document.querySelector('.editor-date').innerHTML = formatDate(post.created);
            }

            // add tags
            if (post.tags && post.tags.length > 0) {
                var tagInput = document.createElement('input');
                for (var i in post.tags) {
                    var tag = post.tags[i];
                    if (tag.name && tag.name.length > 0) {
                        appendTag(tag.name, tag.color);
                    }
                }

            }
            if (post.body) {
                setBodyValue(post.body);
            }

            document.querySelector('.publish').innerHTML = "Update";
            document.querySelector('.publish').setAttribute('onclick', 'Plume.publishPost(\''+url+'\')');
            window.history.pushState("", document.querySelector('title').value, window.location.pathname+"?edit="+encodeURIComponent(url));
        } else {
            document.querySelector('.publish').innerHTML = "Publish";
            document.querySelector('.publish').setAttribute('onclick', 'Plume.publishPost()');
            window.history.pushState("", document.querySelector('title').value, window.location.pathname+"?new");
        }
    };

    var setColor = function(color) {
        document.querySelector('.color-picker').style.background = window.getComputedStyle(document.querySelector('.'+color), null).backgroundColor;
        document.querySelector('.pure-menu-active').classList.remove('pure-menu-active');
        document.querySelector('.editor-add-tag').focus();
    };

    var resetAll = function() {
        document.querySelector('.nav').classList.remove('hidden');
        document.querySelector('.editor').classList.add('hidden');
        document.querySelector('.viewer').classList.add('hidden');
        document.querySelector('.viewer').innerHTML = '';
        document.querySelector('.posts').classList.remove('hidden');
        document.querySelector('.editor-title').value = '';
        document.querySelector('.editor-author').innerHTML = '';
        document.querySelector('.editor-date').innerHTML = formatDate();
        document.querySelector('.editor-tags').innerHTML = '';
        document.querySelector('.editor-add-tag').value = '';
        setBodyValue('');
        if (posts && Object.keys(posts).length === 0) {
            document.querySelector('.start').classList.remove('hidden');
        } else {
            document.querySelector('.start').classList.add('hidden');
        }

        window.history.pushState("", document.querySelector('title').value, window.location.pathname);
    };

    var publishPost = function(url) {
        var post = (url)?posts[url]:{};
        post.title = trim(document.querySelector('.editor-title').value);
        post.body = getBodyValue();
        post.tags = [];
        var allTags = document.querySelectorAll('.editor-tags .post-category');
        for (var i in allTags) {
            if (allTags[i].style) {
                var tag = {};
                tag.name = allTags[i].querySelector('span').innerHTML;
                tag.color = rgbToHex(allTags[i].style.background);
                post.tags.push(tag);
            }
        }

        if (!url) {
            post.author = user.webid;
            post.created = moment().utcOffset('00:00').format("YYYY-MM-DDTHH:mm:ssZ");
        }

        savePost(post, url);
    };

    // update author details with more recent data
    var updateAuthorInfo = function(webid) {
        // check if self first
        if (webid == user.webid) {
            return;
        }

        Solid.getWebIDProfile(webid).then(function(g) {
            getUserProfile(webid, g).then(
                function(profile) {
                    authors[webid] = profile;
                }
            );
        });
    };

    // save post data to server
    var savePost = function(post, url) {
        console.log(post);
        // this is called after the post data is done writing to the server
        var updateLocal = function(location) {
            post.url = location;
            posts[post.url] = post;
            // select element holding all the posts
            var postsdiv = document.querySelector('.posts');
            // add/update post element
            var article = addPostToDom(post);

            if (url) {
                var self = document.getElementById(url);
                self.parentNode.replaceChild(article, self);
            } else if (postsdiv.hasChildNodes()) {
                var first = postsdiv.childNodes[0];
                postsdiv.insertBefore(article, first);
            } else {
                postsdiv.appendChild(article);
            }

            // fade out to indicate new content
            article.scrollIntoView(true);
            article.classList.add("fade-out");
            notify('success', 'Your post was published');
            setTimeout(function() {
                article.style.background = "transparent";
            }, 500);
            resetAll();
        };

        //TODO also write tags
        var g = new $rdf.graph();
        g.add($rdf.sym('#this'), RDF('type'), SIOC('Post'));
        g.add($rdf.sym('#this'), DCT('title'), $rdf.lit(post.title));
        g.add($rdf.sym('#this'), SIOC('has_creator'), $rdf.sym('#author'));
        g.add($rdf.sym('#this'), DCT('created'), $rdf.lit(post.created, '', $rdf.Symbol.prototype.XSDdateTime));
        g.add($rdf.sym('#this'), SIOC('content'), $rdf.lit(encodeHTML(post.body)));

        g.add($rdf.sym('#author'), RDF('type'), SIOC('UserAccount'));
        g.add($rdf.sym('#author'), SIOC('account_of'), $rdf.sym(post.author));
        g.add($rdf.sym('#author'), FOAF('name'), $rdf.lit(authors[post.author].name));
        g.add($rdf.sym('#author'), SIOC('avatar'), $rdf.sym(authors[post.author].picture));

        var triples = new $rdf.Serializer(g).toN3(g);

        if (url) {
            var writer = Solid.putResource(url, triples);
        } else {
            var slug = makeSlug(post.title);
            var writer = Solid.newResource(config.dataContainer, slug, triples);
        }
        writer.then(
            function(res) {
                updateLocal(res.url);
            }
        )
        .catch(
            function(err) {
                console.log("Could not create post!");
                console.log(err);
                notify('error', 'Could not create post');
                resetAll();
            }
        );
    };

    var fetchPosts = function() {
        // select element holding all the posts
        var postsdiv = document.querySelector('.posts');

        // Sort by date
        // array.sort(function(a,b){
        //     var c = new Date(a.isoDate);
        //     var d = new Date(b.isoDate);
        //     return c-d;
        // });

        Solid.getContainerResources(config.dataContainer).then(
            function(statements) {
                if (statements.length === 0) {
                    resetAll();
                }
                statements.forEach(function(s){
                    console.log("Fetching post "+s.object.uri);
                    var url = s.object.uri;
                    Solid.getResource(url).then(
                        function(g) {
                            var p = g.statementsMatching(undefined, RDF('type'), SIOC('Post'))[0];

                            if (p) {
                                var subject = p.subject;
                                var post = { url: subject.uri };

                                // add title
                                var title = g.any(subject, DCT('title'));
                                if (title && title.value) {
                                    post.title = encodeHTML(title.value);
                                }

                                // add author
                                var creator = g.any(subject, SIOC('has_creator'));
                                if (creator) {
                                    var author = {};
                                    var accountOf = g.any(creator, SIOC('account_of'));
                                    if (accountOf) {
                                        post.author = encodeHTML(accountOf.uri);
                                    }
                                    var name = g.any(creator, FOAF('name'));
                                    if (name && name.value && name.value.length > 0) {
                                        author.name = encodeHTML(name.value);
                                    }
                                    var picture = g.any(creator, SIOC('avatar'));
                                    if (picture) {
                                        author.picture = encodeHTML(picture.uri);
                                    }

                                    // add to list of authors if not self
                                    if (post.author != user.webid) {
                                        authors[post.author] = author;
                                    }

                                    // update author info with fresh data
                                    updateAuthorInfo(post.author, url);
                                }

                                // add date
                                var created = g.any(subject, DCT('created'));
                                if (created) {
                                    post.created = created.value;
                                }

                                // add body
                                var body = g.any(subject, SIOC('content'));
                                if (body) {
                                    post.body = body.value;
                                }

                                // add post to local list
                                posts[post.url] = post;

                                // add post to dom
                                var article = addPostToDom(post);
                                postsdiv.appendChild(article);
                            }
                        }
                    )
                    .catch(
                        function(err) {
                            console.log('Could not fetch post from: '+url+' HTTP '+err);
                        }
                    );
                });
            }
        )
        .catch(
            function(err) {
                console.log('Could not fetch contents from data container: '+config.dataContainer+' Error: '+err);
            }
        );
    };

    var getAuthorByWebID = function(webid) {
        var name = 'Unknown';
        var picture = 'img/icon-blue.svg';
        if (webid && webid.length > 0) {
            var author = authors[webid];
            if (author && author.name) {
                name = author.name;
            }
            if (author && author.picture) {
                picture = author.picture;
            }
        }
        return {name: name, picture: picture};
    };

    var addPostToDom = function(post) {
        // change separator: <h1 class="content-subhead">Recent Posts</h1>
        if (!post) {
            return;
        }
        var author = getAuthorByWebID(post.author);
        var name = author.name;
        var picture = author.picture;

        // create main post element
        var article = document.createElement('article');
        article.classList.add('post');
        article.id = post.url;

        // create header
        var header = document.createElement('header');
        header.classList.add('post-header');
        // append header to article
        article.appendChild(header);

        // set avatar
        var avatar = document.createElement('img');
        avatar.classList.add('post-avatar');
        avatar.src = picture;
        avatar.alt = avatar.title = name+"'s picture";
        // append picture to header
        header.appendChild(avatar);

        // create title
        var title = document.createElement('h2');
        title.classList.add('post-title');
        title.innerHTML = (post.title)?'<a class="clickable" onclick="Plume.showViewer(\''+post.url+'\')">'+post.title+'</a>':'';
        // append title to header
        header.appendChild(title);

        // add meta data
        var meta = document.createElement('p');
        meta.classList.add('post-meta');
        meta.innerHTML = "By ";
        // append meta to header
        header.appendChild(meta);

        // create meta author
        var metaAuthor = document.createElement('a');
        metaAuthor.classList.add('post-author');
        metaAuthor.href = post.author;
        metaAuthor.innerHTML = name;
        // append meta author to meta
        meta.appendChild(metaAuthor);

        // create meta date
        var metaDate = document.createElement('span');
        metaDate.classList.add('post-date');
        metaDate.innerHTML = " on "+formatDate(post.created);
        // append meta date to meta
        meta.appendChild(metaDate);

        // create meta tags
        if (post.tags && post.tags.length > 0) {
            var metaTags = document.createElement('span');
            metaTags.classList.add('post-tags');
            metaTags.innerHTML = " under ";
            for (var i in post.tags) {
                var tag = post.tags[i];
                if (tag.name && tag.name.length > 0) {
                    var tagLink = document.createElement('a');
                    tagLink.classList.add('post-category');
                    if (tag.color) {
                        tagLink.setAttribute('style', 'background:'+tag.color+';');
                    }
                    tagLink.innerHTML = tag.name;
                    tagLink.href = "#";
                    tagLink.setAttribute('onclick', 'Plume.sortTag("'+tag.name+'")');
                    metaTags.appendChild(tagLink);
                }
            }

            // append meta tag
            meta.appendChild(metaTags);
        }

        // create body
        var body = document.createElement('section');
        body.classList.add('post-body');
        body.innerHTML = parseMD(decodeHTML(post.body));
        // append body to article
        article.appendChild(body);

        // add footer with action links
        var footer = document.createElement('footer');
        if (user.webid == post.author) {
            // edit button
            var edit = document.createElement('a');
            edit.classList.add("action-button");
            edit.setAttribute('onclick', 'Plume.showEditor(\''+post.url+'\')');
            edit.setAttribute('title', 'Edit post');
            edit.innerHTML = '<img src="img/logo.svg" alt="Edit post">Edit';
            footer.appendChild(edit);
            // delete button
            var del = document.createElement('a');
            del.classList.add('action-button');
            del.classList.add('danger-text');
            del.setAttribute('onclick', 'Plume.confirmDelete(\''+post.url+'\')');
            del.innerHTML = 'Delete';
            footer.appendChild(del);
        }

        // append footer to post
        article.appendChild(footer);

        // append article to list of posts
        return article;
    };

    var sortTag = function(name) {
        console.log(name);
    };

    // Misc/helper functions
    var notify = function(ntype, text) {
        var timeout = 1000;
        var note = document.createElement('div');
        note.classList.add('note');
        note.innerHTML = text;
        switch (ntype) {
            case 'success':
                note.classList.add('success');
                break;
            case 'error':
                timeout = 3000;
                note.classList.add('danger');
                var tip = document.createElement('small');
                tip.classList.add('small');
                tip.innerHTML = ' Tip: check console for debug information.';
                note.appendChild(tip);
                break;
            default:
        }
        document.querySelector('body').appendChild(note);

        setTimeout(function() {
            note.remove();
        }, timeout);
    };

    // Convert rgb() to #hex
    var rgbToHex = function (color) {
        color = color.replace(/\s/g,"");
        var aRGB = color.match(/^rgb\((\d{1,3}[%]?),(\d{1,3}[%]?),(\d{1,3}[%]?)\)$/i);
        if(aRGB)
        {
            color = '';
            for (var i=1;  i<=3; i++) color += Math.round((aRGB[i][aRGB[i].length-1]=="%"?2.55:1)*parseInt(aRGB[i])).toString(16).replace(/^(.)$/,'0$1');
        }
        else color = color.replace(/^#?([\da-f])([\da-f])([\da-f])$/i, '$1$1$2$2$3$3');
        return '#'+color;
    };

    var togglePreview = function() {
        editor.togglePreview();
        var text = document.querySelector('.preview');
        text.innerHTML = (text.innerHTML=="Preview")?"Edit":"Preview";
    };

    // formatDate
    var formatDate = function(date) {
        return moment(date).format('LL');
    };

    // sanitize strings
    var trim = function(str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
    var makeSlug = function(str) {
        return trim(str).replace(/ /g, '-').replace(/[^A-Za-z0-9-]/g, '').toLowerCase();;
    };

    // escape HTML code
    var encodeHTML = function (html) {
        return html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    var decodeHTML = function (html) {
        return html
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, "\"")
            .replace(/&#039;/g, "'");
    };


    // start app
    init();



    // return public functions
    return {
        user: user,
        resetAll: resetAll,
        showEditor: showEditor,
        showViewer: showViewer,
        setColor: setColor,
        publishPost: publishPost,
        confirmDelete: confirmDelete,
        deletePost: deletePost,
        togglePreview: togglePreview
    };
}(this, this.document));
