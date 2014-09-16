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

  this.$panel = $('<div class="fcf-show-comments">'
    + '<a href="#" class="fcf-show-owner-comments fcf-toggle-mode" title="View ' + this.owner.getName() + ' comments"><img src="" height="23" width="23" /></a>'
    + '<a href="#" class="fcf-show-all-comments fcf-toggle-mode">View All Comments</a>'
    + '</div>');

  var that = this;

  this.$panel.find('a.fcf-toggle-mode').on('click', function() {
    that.toggleAuthorFilter();
  });

  this.$noComments = $('<li class="UFIRow fcf-no-comments">No comments</li>');

  setInterval(function() {
    that.update();
  }, 200);

  this.init();
};

CommentList.prototype.init = function() {
  this.comments = [];
  this.authorFilters = [];
  this.users = new UserList();

  this.$el.addClass('fcf-comment-list');

  var that = this;

  this.owner.fetchImageUrl(function(imageUrl) {
    that.$panel.find('img').attr('src', imageUrl);
    that.$el.find('.UFILikeSentenceText').append(that.$panel);
  });

  this.userFilterView = new UserFilterView(this.$panel, this.authorFilters, this.users);

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
    userCount = this.users.length;

  this.$el.find('.UFIComment:not(.fcf-comment)').each(function() {
    var $comment = $(this);

    $comment.addClass('fcf-comment');

    var comment = new Comment($comment);

    comment.onClickShowAuthor = function() {
      that.authorFilters.push(this.mentionedUser.getId());

      that.filterAuthorComments();
    };

    that.comments.push(comment);

    that.users.add(comment.author);
  });

  if (this.users.length > userCount) {
    this.userFilterView.update();
  }
};

CommentList.prototype.toggleAuthorFilter = function() {
  this.authorFilters = this.authorFilters.length ? [] : [this.owner.getId()];

  this.$el.toggleClass('fcf-filter-mode', !!this.authorFilters.length);

  this.update();
};

CommentList.prototype.update = function() {
  this.processNewComments();

  if (this.authorFilters.length) {
    this.filterAuthorComments();
  } else {
    this.$panel.toggle(!!this.getCount());
  }
};

CommentList.prototype.getCount = function() {
  return this.$el.find('.fcf-comment').length;
};

CommentList.prototype.filterAuthorComments = function() {
  var filters = this.authorFilters,
      notFoundAuthors = filters.slice();

  this.comments.forEach(function(comment) {
    var isVisible = false,
      filterIndex = filters.indexOf(comment.author.getId());

    if (-1 !== filterIndex) {
      isVisible = true;
      delete notFoundAuthors[filterIndex];
    }

    comment.toggleVisible(isVisible);

    if (isVisible) {
      var mentionedUser = comment.getMentionedUser();

      if (mentionedUser && (-1 === filters.indexOf(mentionedUser.getId()))) {
        comment.toggleActions(true);
      } else {
        comment.toggleActions(false);
      }
    }
  });

  if (notFoundAuthors.filter(Number).length && !this.fetchComments()) {
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
};

UserList.prototype.add = function(user) {
  if (!this.users[user.getId()]) {
    this.users[user.getId()] = user;
    this.length++;
  }
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
}

// User Filter
var UserFilter = function() {
  this.users = {};
};

UserFilter.prototype.add = function(user) {
  this.users[user.getId()] = user;
};

UserFilter.prototype.remove = function(user) {
  delete this.users[user.getId()];
};

UserFilter.prototype.hasId = function(id) {
  return !!this.users[id] || false;
};

// User Filter View
var UserFilterView = function($el, userFilter, users) {
  this.$el = $el;
  this.userFilter = userFilter;
  this.users = users;

  this.$openLink = $('<a href="#" class="fcf-user-filter-show" title="View users">+</a>');

  this.$userList = $('<div class="fcf-user-filter-list"><ul><li>No users</li></ul></div>');

  this.$el.append(this.$openLink);
  this.$el.append(this.$userList);

  var that = this;

  this.$openLink.on('click', function() {
    that.toggle();
  });

  this.$userList.on('click', 'li', function() {
    var userId = $(this).data('id');
    $(this).remove();

    that.toggle();
  });
};

UserFilterView.prototype.toggle = function() {
  this.$userList.toggle();
};

UserFilterView.prototype.update = function() {
  var $userList = $('<ul></ul>');

  this.users.forEach(function(user) {
    $userList.append('<li data-id="' + user.getId() + '"><a href="#">' + user.getName() + '</a></li>');
  });

  this.$userList.find('ul').replaceWith($userList);
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