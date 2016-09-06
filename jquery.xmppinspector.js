/**
 * Utils to inspect XMPP exchanges through StropheJS
 *
 * Only work with StropheJS and BOSH transport for now.
 *
 * Prettify code from "XMPP professionnal programming"
 *
 *
 * Access to message stack from console: `window._xmppinspector_messageStack`
 *
 * @type {{}}
 */

/**
 * Small utility used to display navigator storage
 *
 */
;(function($) {
  $.fn.extend({
    xmppInspector : function(stropheConnexion, options) {

      this.defaultOptions = {

        /**
         * Maximum message displayed in console
         */
        MAX_MSG_DISPLAYED : 50,

        /**
         * Maximum messages keep in internal stack
         */
        MAX_MSG_STACK : 200

      };

      var settings = $.extend({}, this.defaultOptions, options);

      return this.each(function() {
        var $this = $(this);

        $this.empty();

        // initialize total count if needed
        if (!window._xmppinspector_msgcount) {
          window._xmppinspector_msgcount = 0;
        }

        // if set to true, all messages will be stored
        var storeAllMessages = false;

        // message stack with direct access in console
        var messageStack = {};
        window._xmppinspector_messageStack = messageStack;

        // displayed message count
        var displayed = 0;

        // styling
        $this.css({
          'height' : '600px'
        });

        // title of console
        $("<div>XMPP Inspector</div>")
            .css({
              'font-weight' : 'bolder', 'margin' : "10px"
            }).appendTo($this);

        // checkbox for enable / disable whole history
        var keepHistoryChk = $("<input type='checkbox'>");
        keepHistoryChk.click(function() {
          storeAllMessages = !storeAllMessages;
        });

        var header = $('<div>').append(keepHistoryChk).append(
            ' Keep all messages instead of ' + settings.MAX_MSG_DISPLAYED +
            ' last messages ').appendTo($this);

        // Log XMPP messages in browser console
        var logStackButton = $(
            '<button class="xmppinspector_logMessages">Log messages in browser console</button>');
        logStackButton.click(function() {
          console.info('XMPP messages');
          console.info(messageStack);
        });

        header.append(logStackButton).appendTo($this);

        // console element
        var logSpace = $("<div class='xmppinspector_console'><div/>");
        $this.append(logSpace);

        // add tag on element if mouse is in, to prevent scroll down
        logSpace.mouseenter(function() {
          logSpace.data('mouseon', true);
        });

        logSpace.mouseleave(function() {
          logSpace.data('mouseon', false);
        });

        /**
         * Intercept inbound / outbound traffic
         * @param body
         */
        stropheConnexion.xmlInput = function(body) {
          saveMessages(body, 'incoming');
          show_traffic(body, 'incoming');
          removeExceedMessages();
        };

        stropheConnexion.xmlOutput = function(body) {
          saveMessages(body, 'outgoing');
          show_traffic(body, 'outgoing');
          removeExceedMessages();
        };

        // make resizable
        // $this.resizable();

        /**
         * Save messages in a dedicated stack, in order to log them in console on demand
         * @param body
         * @param type
         */
        var saveMessages = function(body, type) {

          var d = new Date();
          var id = '#' + window._xmppinspector_msgcount + ' ' + d + '_' + d.getMilliseconds() +
              'ms_' + type;

          messageStack[id] = {
            domElement : body, stringValue : body.innerHTML
          };

          if (Object.keys(messageStack).length > settings.MAX_MSG_STACK &&
              storeAllMessages !== true) {

            var sorted = Object.keys(messageStack).sort();

            var toDelete = 100;

            for (var i = 0; i < toDelete; i++) {
              delete messageStack[sorted[i]];
            }

          }
        };

        /**
         * Show traffic in XMPP Inspector
         *
         * @param body
         * @param type
         */
        var show_traffic = function(body, type) {

          // type of message: inbound, outbound
          var classType = "xmppinspector_" + type;

          if (body.childNodes.length > 0) {

            $.each(body.childNodes, function() {

              displayed++;
              window._xmppinspector_msgcount++;

              // title for message, with inbound / outbound, date, ....
              var title = "<h1 class='xmppinspector_title'> #" + window._xmppinspector_msgcount +
                  " " + type + " " + new Date().toUTCString() + "</h1>";

              // container for whole traffic
              var mctr = $("<div class='xmppinspector_messagecontainer'/>");

              mctr.append(title);
              mctr.append(
                  "<div class='xmppinspector_traffic " + classType + "'>" + pretty_xml(this) +
                  "</div>");

              logSpace.append(mctr);
            });

            // scroll down if mouse not on console
            if (logSpace.data('mouseon') !== true) {
              var height = logSpace[0].scrollHeight;
              logSpace.scrollTop(height);
            }
          }
        };

        /**
         * Show pretty XML element
         * @param xml
         * @param level
         * @returns {string}
         */
        var pretty_xml = function(xml, level) {
          var i, j;
          var result = [];
          if (!level) {
            level = 0;
          }

          result.push("<div class='xml_level" + level + "'>");
          result.push("<span class='xml_punc'>&lt;</span>");
          result.push("<span class='xml_tag'>");
          result.push(xml.tagName);
          result.push("</span>");

          // attributes
          var attrs = xml.attributes;
          var attr_lead = []
          for (i = 0; i < xml.tagName.length + 1; i++) {
            attr_lead.push("&nbsp;");
          }
          attr_lead = attr_lead.join("");

          for (i = 0; i < attrs.length; i++) {
            result.push(" <span class='xml_aname'>");
            result.push(attrs[i].nodeName);
            result.push("</span><span class='xml_punc'>='</span>");
            result.push("<span class='xml_avalue'>");
            result.push(attrs[i].nodeValue);
            result.push("</span><span class='xml_punc'>'</span>");

            if (i !== attrs.length - 1) {
              result.push("</div><div class='xml_level" + level + "'>");
              result.push(attr_lead);
            }
          }

          if (xml.childNodes.length === 0) {
            result.push("<span class='xml_punc'>/&gt;</span></div>");
          } else {
            result.push("<span class='xml_punc'>&gt;</span></div>");

            // children
            $.each(xml.childNodes, function() {
              if (this.nodeType === 1) {
                result.push(pretty_xml(this, level + 1));
              } else if (this.nodeType === 3) {
                result.push("<div class='xml_text xml_level" + (level + 1) + "'>");
                result.push(this.nodeValue);
                result.push("</div>");
              }
            });

            result.push("<div class='xml xml_level" + level + "'>");
            result.push("<span class='xml_punc'>&lt;/</span>");
            result.push("<span class='xml_tag'>");
            result.push(xml.tagName);
            result.push("</span>");
            result.push("<span class='xml_punc'>&gt;</span></div>");
          }

          return result.join("");
        };

        /**
         * Remove exceeding messages
         */
        var removeExceedMessages = function() {

          // do not remove messages if asked
          if (storeAllMessages === true) {
            return;
          }

          var toRemove = displayed - settings.MAX_MSG_DISPLAYED;
          if (toRemove > 0) {

            logSpace.find(".xmppinspector_messagecontainer").each(function() {

              $(this).remove();

              toRemove--;
              displayed--;

              if (toRemove < 1) {
                return false;
              }

            });

          }

        };

      });
    }
  });
})(jQuery);