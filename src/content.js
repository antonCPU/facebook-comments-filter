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
  var that = this;

  this.id  = id;
  this.$el = $el;
  this.mode = 'all';

  this.ownerName = this.detectOwnerName();

  if (!this.ownerName) {
    return this;
  }

  this.$link = $('<div class="fcf-show-comments">'
                   + '<a href="#" class="fcf-show-owner-comments">View ' + this.ownerName + ' Comments</a>'
                   + '<a href="#" class="fcf-show-all-comments">View All Comments</a>'
               + '</div>');

  this.$link.on('click', function() {
    that.toggleMode();
  });

  this.$noComments = $('<li class="UFIRow fcf-no-comments">No ' + this.ownerName + ' comments</li>');

  this.init();

  setInterval(function() {
    that.updateMode();
  }, 100);

  that.updateMode();
};

Content.prototype.init = function() {
  this.$el.addClass('fcf-content');

  this.$el.find('.UFILikeSentenceText').append(this.$link);
};

Content.prototype.refresh = function($el) {
  this.$el = $el;

  if (!this.$el.hasClass('fcf-content')) {
    this.init();

    this.updateMode();
  }
};

Content.prototype.detectOwnerName = function() {
  return this.$el.find('a[data-hovercard]:not([aria-hidden]):eq(0)').html();
};

Content.prototype.toggleMode = function() {
  if (this.mode === 'all') {
    this.mode = 'owner';
  } else {
    this.mode = 'all';
  }

  this.updateMode();
};

Content.prototype.updateMode = function() {
  if (this.mode === 'owner') {
    this.showOwnerComments();
  } else {
    this.$el.removeClass('fcf-mode-owner');
    this.$link.toggle(!!this.getCommentsCount());
  }

  this.processComments();
};

Content.prototype.processComments = function() {
  this.$el.find('.UFIList .UFIComment:not(.fcf-comment)').each(function() {
    var $comment = $(this);

    $comment.addClass('fcf-comment');

    if ($comment.find('.UFICommentBody a.profileLink').length) {
      $comment.find('.UFICommentActions').append($('<a href="#" class="fcf-show-author-comments">Show comments</a>'));
    }
  });
};

Content.prototype.getCommentsCount = function() {
  return this.$el.find('.UFIComment').length;
};

Content.prototype.showOwnerComments = function() {
  var name = this.ownerName,
      count = 0;

  this.$el.addClass('fcf-mode-owner');

  this.$el.find('.UFIComment').each(function() {
    var $comment = $(this);

    if (name === $comment.find('.UFICommentActorName').html()) {
      $comment.addClass('fcf-owner-comment');
      count++;
    }
  });

  if (!count && !this.fetchComments()) {
    this.toggleNoComments(true);
  } else {
    this.toggleNoComments(false);
  }
};

Content.prototype.toggleNoComments = function(needShow) {
  if (needShow) {
    if (!this.$el.find('.UFIList .fcf-no-comments').length) {
      if (this.$el.find('.UFIAddComment').length) {
        this.$el.find('.UFIAddComment').before(this.$noComments);
      } else {
        this.$el.find('.UFIList').append(this.$noComments);
      }
    }
  } else {
    this.$el.find('.fcf-no-comments').remove();
  }
};

Content.prototype.fetchComments = function() {
  var pager = this.$el.find('.UFIPagerLink')[0];

  if (pager) {
    pager.click();
    return true;
  }

  return false;
};

// initialize
var feed = new Feed();