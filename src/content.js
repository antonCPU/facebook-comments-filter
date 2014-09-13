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

  if (!this.owner.name) {
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
    + '<a href="#" class="fcf-show-owner-comments">View ' + this.owner.name + ' Comments</a>'
    + '<a href="#" class="fcf-show-all-comments">View All Comments</a>'
    + '</div>');

  var that = this;

  this.$link.on('click', function() {
    that.toggleAuthorFilter();
  });

  this.$noComments = $('<li class="UFIRow fcf-no-comments">No ' + this.owner.name + ' comments</li>');

  setInterval(function() {
    that.update();
  }, 5000);

  this.init();
};

CommentList.prototype.init = function() {
  this.comments = [];
  this.authorFilters = [];

  this.$el.addClass('fcf-comment-list');

  this.$el.find('.UFILikeSentenceText').append(this.$link);

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
      that.authorFilters.push(this.mentionedUser.id);

      that.filterAuthorComments();
    };

    that.comments.push(comment);
  });
};

CommentList.prototype.toggleAuthorFilter = function() {
  this.authorFilters = this.authorFilters.length ? [] : [this.owner.id];

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
  }
};

CommentList.prototype.getCount = function() {
  return this.$el.find('.fcf-comment').length;
};

CommentList.prototype.filterAuthorComments = function() {
  var filters = this.authorFilters,
      count = 0;

  this.comments.forEach(function(comment) {
    var isVisible = false;

    if (-1 !== filters.indexOf(comment.author.id)) {
      isVisible = true;
      count++
    }

    comment.$el.toggleClass('fcf-comment-visible', isVisible);
  });

  if (!count && !this.fetchComments()) {
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

  var that = this;

  var $mentionedProfileLink = $el.find('.UFICommentBody a.profileLink');

  if ($mentionedProfileLink.length) {
    this.$showAuthorComments = $('<a href="#" class="fcf-show-author-comments">Show comments</a>');

    $el.find('.UFICommentActions').append(this.$showAuthorComments);

    this.$showAuthorComments.on('click', function() {
      that.mentionedUser = new Profile($mentionedProfileLink);

      that.onClickShowAuthor();
    });
  }
};

Comment.prototype.onClickShowAuthor = function() {};

var Profile = function($link) {
  this.id = $link.data('hovercard').match(/\?id=([^&.]+)/)[1];
  this.name = $link.html()
};

// initialize
var feed = new Feed();