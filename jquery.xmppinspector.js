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
(function($) {

  $.fn.xmppInspector = function(stropheConnexion) {

    var MAX_MSG_DISPLAYED = 50;
    var MAX_MSG_STACK = 400;
    var storeAllMessages = false;

    var messageStack = {};

    // keep direct access in console
    window._xmppinspector_messageStack = messageStack;

    // initialize count if necessary
    var msgcount = 0;

    // empty element first
    $(this).empty();

    // styling
    $(this).css({
      'height' : '200px',
    });

    // make resizable
    $(this).resizable();

    // Header of console with title and commands
    var header = $("<div/>").css({padding : "1em"});
    $(this).append(header);

    // title of console
    $("<div>XMPP Inspector: </div>")
        .css({
          'font-weight' : 'bolder', 'margin' : "10px"
        }).appendTo(header);

    // checkbox for enable / disable whole history
    var keepHistoryChk = $("<input type='checkbox'>");
    keepHistoryChk.click(function() {
      storeAllMessages = !storeAllMessages;
    });

    header.append(keepHistoryChk).append(
        " Conserver tout l'historique (autrement seuls les " + MAX_MSG_DISPLAYED +
        " derniers messages seront conservés)");

    // Log messages in console
    var logStackButton = $(
        "<button class='xmppinspector_logMessages'>Afficher les messages en consoles</button>");
    logStackButton.click(function() {

      console.info("Messages XMPP");
      console.info(messageStack);

    });

    header.append("&nbsp;&nbsp;&nbsp;").append(logStackButton);

    // console element
    var logSpace = $("<div class='xmppinspector_console'><div/>");
    $(this).append(logSpace);

    logSpace.css({
      'overflow' : 'scroll', 'background' : 'black', 'height' : '90%', 'padding' : '15px'
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
    };

    var _deleted = 0;

    /**
     * Save messages in a dedicated stack, in order to log them in console on demand
     * @param body
     * @param type
     */
    var saveMessages = function(body, type) {

      var d = new Date();

      messageStack[d + "_" + d.getMilliseconds() + "ms_" + type] = {
        domElement : body, stringValue : $(body),
      };

      if (Object.keys(messageStack).length > MAX_MSG_STACK && storeAllMessages !== true) {

        var sorted = Object.keys(messageStack).sort();

        var toDelete = 100;

        for (var i = 0; i < toDelete; i++) {
          delete messageStack[sorted[i]];
        }

      }
    };

    /**
     * Show traffic in XMPP Inspector
     * @param body
     * @param type
     */
    var show_traffic = function(body, type) {

      // title for message, with inbound / outbound, date, ....
      var title = "<h1 class='xmppinspector_title'>" + type + " " + new Date().toUTCString() +
          "</h1>";

      // type of message: inbound, outbound
      var classType = "xmppinspector_" + type;

      if (body.childNodes.length > 0) {

        $.each(body.childNodes, function() {

          window._xmppinspector_msgcount++;

          // container for whole traffic
          var mctr = $("<div class='xmppinspector_messagecontainer'/>");

          mctr.append(title);
          mctr.append("<div class='xmppinspector_traffic " + classType + "'>" + pretty_xml(this) +
              "</div>");

          logSpace.append(mctr);
        });

        // scroll down
        var height = logSpace[0].scrollHeight;
        logSpace.scrollTop(height);

      }
    };

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

    var text_to_xml = function(text) {
      var doc = null;
      if (window['DOMParser']) {
        var parser = new DOMParser();
        doc = parser.parseFromString(text, 'text/xml');
      } else if (window['ActiveXObject']) {
        var doc = new ActiveXObject("MSXML2.DOMDocument");
        doc.async = false;
        doc.loadXML(text);
      } else {
        throw {
          type : 'PeekError', message : 'No DOMParser object found.'
        };
      }

      var elem = doc.documentElement;
      if ($(elem).filter('parsererror').length > 0) {
        return null;
      }
      return elem;
    };

    /**
     * Remove exceeding messages
     */
    var removeExceedMessages = function() {

      // do not remove messages if asked
      if (storeAllMessages === true) {
        return;
      }

      var toRemove = msgcount - MAX_MSG_DISPLAYED;
      if (toRemove > 0) {

        logSpace.find(".xmppinspector_messagecontainer").each(function() {

          $(this).remove();

          toRemove--;
          window._xmppinspector_msgcount--;

          if (toRemove < 1) {
            return false;
          }

          //console.error("Removed: ", $(this));

        });

      }

    };

    return this;

  };

}(jQuery));