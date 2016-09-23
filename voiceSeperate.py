import sys
import lxml.etree as le

meiFile = sys.argv[1] 
voiceNum = sys.argv[2]
with open(meiFile, 'r') as f:
    doc=le.parse(f)
    for elem in doc.xpath('//mei:staffDef[attribute::n] | //mei:staff[attribute::n]', namespaces={'mei':'http://www.music-encoding.org/ns/mei'}):
        if elem.attrib['n'] == voiceNum:
            #elem.attrib.pop('n')
            pass
        else:
            parent = elem.getparent()
            parent.remove(elem)
    print(le.tostring(doc))
