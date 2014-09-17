// Feed
var Feed = function() {
  var that = this;

  this.contentList = {};

  setInterval(function() {
    that.parseNew();
  }, 1000);

  this.parseNew();
};

Feed.prototype.parseNew = function() {
  var that = this;

  $('.userContentWrapper').each(function() {
    var $el = $(this),
        data = $el.parent().data('ft'),
        id  = data ? data.mf_story_key : null;

    if (id) {
      if (!that.contentList[id]) {
        that.contentList[id] = new Content(id, $el);
      } else {
        that.contentList[id].refresh($el);
      }
    }
  });
};

// User
var User = function($el) {
  this.$el = $el;

  this.id = null;
  this.name = null;
  this.imageUrl = null;

  if (!$el.data('hovercard') || $el.attr('href').match(/groups/)) {
    this.id   = false;
    this.name = false;
    this.imageUrl = false;
  }
};

User.prototype.getId = function() {
  if (this.id === null) {
    this.id = this.$el.data('hovercard').match(/\?id=([^&.]+)/)[1]
  }

  return this.id;
};

User.prototype.getName = function() {
  if (this.name === null) {
    this.name = this.$el.html();
  }

  return this.name;
};

User.prototype.fetchImageUrl = function(callback) {
  if (this.imageUrl === null) {
    var that = this;

    this.fetchHovercardImageUrl(function(imageUrl) {
      that.imageUrl = imageUrl;

      callback(imageUrl);
    });
  } else {
    callback(this.imageUrl);
  }
};

User.prototype.fetchHovercardImageUrl = function(callback) {
  var url = this.$el.data('hovercard');
  url += '&endpoint=' + encodeURIComponent(url);
  url += '&__a=1';

  $.ajax({
    type: 'GET',
    dataType: 'text',
    url: url,
    success: function(data) {
      var imageUrl = data.match(/img class=\\"_s0 _7lw _rv img\\" src=\\"([^">]+\.jpg\?[^">]+)\\"/);

      if (!imageUrl) {
        callback(false);
      } else {
        imageUrl = JSON.parse('"' + imageUrl.pop() + '"').replace(/&amp;/g, '&');

        callback(imageUrl);
      }
    }
  });
};

// Content
var Content = function(id, $el) {
  this.id  = id;
  this.$el = $el;

  this.owner = new ContentOwner($el);

  if (!this.owner.getName()) {
    return;
  }

  this.comments = new CommentList($el.find('.UFIList'), this.owner);

  this.init();
};

Content.prototype.init = function() {
  this.$el.addClass('fcf-content');
};

Content.prototype.refresh = function($el) {
  this.$el = $el;

  if (!this.$el.hasClass('fcf-content')) {
    this.init();

    this.comments.refresh($el.find('.UFIList'));
  }
};

// Content User
var ContentOwner = function($content) {
  this.$content = $content;
  this.$el = $content.find('a[data-hovercard]:not([aria-hidden]):eq(0)');

  User.call(this, this.$el);
};

ContentOwner.prototype = Object.create(User.prototype);
ContentOwner.prototype.constructor = ContentOwner;

ContentOwner.prototype.fetchImageUrl = function(callback) {
  if (this.imageUrl === null) {
    if (this.$el.closest('.clearfix').closest('.userContentWrapper').length) {
      this.imageUrl = this.$content.find('a[data-hovercard][aria-hidden] img').attr('src');
    } else {
      User.prototype.fetchImageUrl.call(this, callback);
      return;
    }
  }

  callback(this.imageUrl);
};

var CommentList = function($el, owner) {
  this.$el = $el;
  this.owner = owner;

  this.$noComments = $('<li class="UFIRow UFIFirstCommentComponent fcf-no-comments">No comments</li>');

  var that = this;

  setInterval(function() {
    that.update();
  }, 200);

  this.init();
};

CommentList.prototype.init = function() {
  this.comments = [];
  this.filter = new UserFilter();
  this.users = new UserList();

  this.$el.addClass('fcf-comment-list');

  var that = this;

  this.userFilterView = new UserFilterView(this.$el, this.owner, this.filter, this.users);

  this.filter.onChange(function() {
    that.filterComments();
  });

  this.update();
};

CommentList.prototype.refresh = function($el) {
  this.$el = $el;

  if (!this.$el.hasClass('fcf-comment-list')) {
    this.init();
  }
};

CommentList.prototype.processNewComments = function() {
  var that = this,
      users = [],
      count = 0;

  this.$el.find('.UFIComment:not(.fcf-comment)').each(function() {
    var $comment = $(this);

    $comment.addClass('fcf-comment');

    var comment = new Comment($comment);

    comment.onClickShowAuthor = function() {
      that.filter.add(this.mentionedUser);
    };

    that.comments.push(comment);

    users.push(comment.author);

    count++;
  });

  this.users.merge(users);

  if (count) {
    this.filterComments();
  }
};

CommentList.prototype.update = function() {
  this.processNewComments();

  if (!this.filter.length) {
    this.userFilterView.toggle(!!this.getCount());
  }
};

CommentList.prototype.getCount = function() {
  return this.$el.find('.fcf-comment').length;
};

CommentList.prototype.filterComments = function() {
  var filter = this.filter,
      notFoundAuthors = filter.getIds();

  this.$el.toggleClass('fcf-filter-mode', !!filter.length);

  if (!filter.length) {
    return;
  }

  this.comments.forEach(function(comment) {
    var isVisible = false;

    if (filter.has(comment.author)) {
      isVisible = true;
      var index = notFoundAuthors.indexOf(comment.author.getId());
      if (-1 !== index) {
        delete notFoundAuthors[index];
      }
    }

    comment.toggleVisible(isVisible);

    if (isVisible) {
      var mentionedUser = comment.getMentionedUser();

      if (mentionedUser && !filter.has(mentionedUser)) {
        comment.toggleActions(true);
      } else {
        comment.toggleActions(false);
      }
    }
  });

  if ((notFoundAuthors.filter(Number).length === filter.length)  && !this.fetchComments()) {
    this.toggleNoComments(true);
  } else {
    this.toggleNoComments(false);
  }
};

CommentList.prototype.toggleNoComments = function(needShow) {
  if (needShow) {
    if (!this.$el.find('.fcf-no-comments').length) {
      if (this.$el.find('.UFIAddComment').length) {
        this.$el.find('.UFIAddComment').before(this.$noComments);
      } else {
        this.$el.append(this.$noComments);
      }
    }
  } else {
    this.$el.find('.fcf-no-comments').remove();
  }
};

CommentList.prototype.fetchComments = function() {
  var pager = this.$el.find('.UFIPagerLink')[0];

  if (pager) {
    pager.click();
    return true;
  }

  return false;
};

// User List
var UserList = function() {
  this.users = {};
  this.length = 0;
  this.onChangeListeners = [];
};

UserList.prototype.add = function(user) {
  if (!this.users[user.getId()]) {
    this.users[user.getId()] = user;
    this.length++;
    this.triggerOnChange();
  }
};

UserList.prototype.remove = function(user) {
  if (this.users[user.getId()]) {
    delete this.users[user.getId()];
    this.length--;
    this.triggerOnChange();
  }
};

UserList.prototype.clear = function() {
  this.users = {};
  this.length = 0;
  this.triggerOnChange();
};

UserList.prototype.forEach = function(callback) {
  for (var id in this.users) {
    if (this.users.hasOwnProperty(id)) {
      callback(this.users[id]);
    }
  }
};

UserList.prototype.get = function(id) {
  return this.users[id] || null;
};

UserList.prototype.merge = function(users) {
  var that = this,
      count = 0;

  users.forEach(function(user) {
    if (!that.users[user.getId()]) {
      that.users[user.getId()] = user;
      count++;
    }
  });

  if (count) {
    this.length += count;
    this.triggerOnChange();
  }
};

UserList.prototype.onChange = function(callback) {
  this.onChangeListeners.push(callback);
};

UserList.prototype.triggerOnChange = function() {
  var that = this;

  this.onChangeListeners.forEach(function(listener) {
    listener.call(that);
  });
};

// User Filter
var UserFilter = function() {
  UserList.call(this);
};

UserFilter.prototype = Object.create(UserList.prototype);
UserFilter.prototype.constructor = UserFilter;

UserFilter.prototype.has = function(user) {
  return !!this.users[user.getId()] || false;
};

UserFilter.prototype.getIds = function() {
  var ids = [];

  this.forEach(function(user) {
    ids.push(user.getId());
  });

  return ids;
};

// User Filter View
var UserFilterView = function($el, owner, filter, users) {
  this.$el = $el;
  this.owner = owner;
  this.filter = filter;
  this.users = users;

  var that = this;

  this.$panel = $('<div class="fcf-show-comments">'
    + '<a href="#" class="fcf-show-owner-comments" title="Show ' + this.owner.getName() + ' comments">'
    +   '<img src="" width="23" height="23" />'
    + '</a>'
    + '<a href="#" class="fcf-show-all-comments" title="Show All Comments">'
    +   '<img src="' + chrome.extension.getURL("comment.png") + '" width="23" height="23" />'
    + '</a>'
    + '</div>');

  this.$panel.find('a.fcf-show-owner-comments').on('click', function() {
    that.filter.add(that.owner);
  });

  this.$panel.find('a.fcf-show-all-comments').on('click', function() {
    that.filter.clear();
  });

  this.owner.fetchImageUrl(function(imageUrl) {
    that.$panel.find('.fcf-show-owner-comments img').attr('src', imageUrl);
    that.$el.find('.UFILikeSentenceText').append(that.$panel);
  });

  this.$openLink = $('<a href="#" class="fcf-user-filter-show" title="Add users">+</a>');

  this.$userList = $('<div class="fcf-user-filter-list"><ul><li>No users</li></ul></div>');

  this.$panel.append(this.$openLink);
  this.$panel.append(this.$userList);

  this.$openLink.on('click', function() {
    that.$userList.toggle();
  });

  this.$userList.on('click', 'a', function() {
    var userId = $(this).parent().data('id');
    that.filter.add(that.users.get(userId));

    $(this).remove();

    that.$userList.toggle();
  });

  this.users.onChange(function() {
    that.update();
  });

  this.filter.onChange(function() {
    that.update();
  });
};

UserFilterView.prototype.toggle = function(show) {
  this.$panel.toggle(show);
};

UserFilterView.prototype.update = function() {
  var $userList = $('<ul></ul>'),
      filter = this.filter,
      count = 0;

  this.users.forEach(function(user) {
    if (!filter.has(user)) {
      var $user = $('<li data-id="' + user.getId() + '">'
        +   '<a href="#"><img src="" width="26" height="26" /><span>' + user.getName() + '</span></a>'
        + '</li>');

      user.fetchImageUrl(function(imageUrl) {
        $user.find('img').attr('src', imageUrl);
      });

      $userList.append($user);
      count++;
    }
  });

  if (!count) {
    $userList.append('<li>No users</li>');
  }

  this.$userList.find('ul').replaceWith($userList);

  this.$panel.find('.fcf-show-owner-comments').toggle(!filter.has(this.owner));
};

// Comment
var Comment = function($el) {
  this.$el = $el;

  this.author = new CommentAuthor($el);

  this.mentionedUser = null;
};

Comment.prototype.toggleActions = function(show) {
  var that = this;

  if (show) {
    var mentionedUser = this.getMentionedUser();

    if (mentionedUser && !this.$el.find('.fcf-show-author-comments').length) {
      this.$showAuthorComments = $('<a href="#" class="fcf-show-author-comments" title="Show ' + mentionedUser.getName() + ' comments"><img src="" width="20" height="20" /></a>');

      mentionedUser.fetchImageUrl(function(imageUrl) {
        that.$showAuthorComments.find('img').attr('src', imageUrl);
        that.$el.find('.UFICommentActions').append(that.$showAuthorComments);
      });

      this.$showAuthorComments.on('click', function() {
        that.onClickShowAuthor();
      });
    } else {
      this.$el.find('.fcf-show-author-comments').show();
    }
  } else {
    this.$el.find('.fcf-show-author-comments').hide();
  }
};

Comment.prototype.getMentionedUser = function() {
  if (this.mentionedUser === null) {
    var $mentionedUserLink = this.$el.find('.UFICommentBody a.profileLink');

    if ($mentionedUserLink.length) {
      var mentionedUser = new User($mentionedUserLink);
      this.mentionedUser = mentionedUser.getId() ? mentionedUser : false;
    }
  }

  return this.mentionedUser;
};

Comment.prototype.toggleVisible = function(show) {
  this.$el.toggleClass('fcf-comment-visible', show);
};

Comment.prototype.onClickShowAuthor = function() {};

// Comment User
var CommentAuthor = function($comment) {
  this.$comment = $comment;
  this.$el = $comment.find('.UFICommentActorName');

  User.call(this, this.$el);
};

CommentAuthor.prototype = Object.create(User.prototype);
CommentAuthor.prototype.constructor = CommentAuthor;

CommentAuthor.prototype.fetchImageUrl = function(callback) {
  if (this.imageUrl === null) {
    this.imageUrl = this.$comment.find('img.UFIActorImage').attr('src');
  }

  callback(this.imageUrl);
};

// initialize
var feed = new Feed();