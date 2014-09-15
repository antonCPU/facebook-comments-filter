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

var Content = function(id, $el) {
  this.id  = id;
  this.$el = $el;

  this.owner = this.detectOwner();

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

Content.prototype.detectOwner = function() {
  return new Profile(this.$el.find('a[data-hovercard]:not([aria-hidden]):eq(0)'));
};

var CommentList = function($el, owner) {
  this.$el = $el;
  this.owner = owner;

  this.$link = $('<div class="fcf-show-comments">'
    + '<a href="#" class="fcf-show-owner-comments" title="View ' + this.owner.getName() + ' comments"><img src="" height="23" width="23" /></a>'
    + '<a href="#" class="fcf-show-all-comments">View All Comments</a>'
    + '</div>');

  var that = this;

  this.$link.on('click', function() {
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

  this.$el.addClass('fcf-comment-list');

  var that = this;

  this.owner.fetchImageUrl(function(imageUrl) {
    that.$link.find('img').attr('src', imageUrl);
    that.$el.find('.UFILikeSentenceText').append(that.$link);
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
  var that = this;

  this.$el.find('.UFIComment:not(.fcf-comment)').each(function() {
    var $comment = $(this);

    $comment.addClass('fcf-comment');

    var comment = new Comment($comment);

    comment.onClickShowAuthor = function() {
      that.authorFilters.push(this.mentionedUser.getId());

      that.filterAuthorComments();
    };

    that.comments.push(comment);
  });
};

CommentList.prototype.toggleAuthorFilter = function() {
  this.authorFilters = this.authorFilters.length ? [] : [this.owner.getId()];

  this.$el.toggleClass('fcf-filter-mode', !!this.authorFilters.length);

  if (!this.authorFilters.length) {
    this.$link.toggle(!!this.getCount());
  }

  this.update();
};

CommentList.prototype.update = function() {
  this.processNewComments();

  if (this.authorFilters.length) {
    this.filterAuthorComments();
  } else {
    this.$link.toggle(!!this.getCount());
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

    var mentionedUser = comment.getMentionedUser();

    if (mentionedUser && (-1 === filters.indexOf(mentionedUser.getId()))) {
      comment.toggleActions(true);
    } else {
      comment.toggleActions(false);
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

var Comment = function($el) {
  this.$el = $el;

  this.author = new Profile($el.find('.UFICommentActorName'));
  this.mentionedUser = null;
};

Comment.prototype.toggleActions = function(show) {
  var that = this;

  if (show) {
    var mentionedUser = this.getMentionedUser();

    if (mentionedUser && !this.$el.find('.fcf-show-author-comments').length) {
      this.$showAuthorComments = $('<a href="#" class="fcf-show-author-comments">Show ' + mentionedUser.getName() + ' comments</a>');

      this.$el.find('.UFICommentActions').append(this.$showAuthorComments);

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
  if (this.mentionedUser) {
    return this.mentionedUser;
  }

  var $mentionedProfileLink = this.$el.find('.UFICommentBody a.profileLink');

  if ($mentionedProfileLink.length) {
    this.mentionedUser = new Profile($mentionedProfileLink);
  }

  return this.mentionedUser;
};

Comment.prototype.toggleVisible = function(show) {
  this.$el.toggleClass('fcf-comment-visible', show);
};

Comment.prototype.onClickShowAuthor = function() {};

var Profile = function($link) {
  this.$el = $link;

  this.id = null;
  this.name = null;
  this.imageUrl = null;

  if (!$link.data('hovercard')) {
    this.id   = false;
    this.name = false;
    this.imageUrl = false;
  }
};

Profile.prototype.getId = function() {
  if (this.id === null) {
    this.id = this.$el.data('hovercard').match(/\?id=([^&.]+)/)[1]
  }

  return this.id;
};

Profile.prototype.getName = function() {
  if (this.name === null) {
    this.name = this.$el.html();
  }

  return this.name;
};

Profile.prototype.fetchImageUrl = function(callback) {
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

Profile.prototype.fetchHovercardImageUrl = function(callback) {
  var url = this.$el.data('hovercard');
  url += '&endpoint=' + encodeURIComponent(url);
  url += '&__a=1';

  $.ajax({
    type: 'GET',
    dataType: 'text',
    url: url,
    success: function(data) {
      var imageUrl = data.match(/img class=\\"_s0 _7lw _rv img\\" src=\\"([^">]+\.jpg\?[^">]+)\\"/).pop();
      imageUrl = JSON.parse('"' + imageUrl + '"').replace(/&amp;/g, '&');

      callback(imageUrl);
    }
  });
};

// initialize
var feed = new Feed();